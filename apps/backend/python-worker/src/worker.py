import subprocess
import sys
import os
import logging
import time
import json
import uuid
import signal
import redis
from datetime import datetime

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Worker:
    def __init__(self, redis_url="redis://localhost:6379", queue_key="jobs"):
        """
        Initialize worker with Redis connection
        
        Args:
            redis_url: Redis connection URL
            queue_key: Base key for job queue in Redis
        """
        self.worker_id = str(uuid.uuid4())[:8]
        self.queue_key = queue_key
        self.redis_url = redis_url
        self.shutdown_requested = False
        
        # Connect to Redis
        try:
            self.redis = redis.from_url(redis_url)
            logger.info(f"Worker {self.worker_id} connected to Redis at {redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise

    def execute_script(self, job_id, script_type, params):
        """
        Execute one of the asset pipeline scripts based on the job type.
        
        Args:
            job_id: The ID of the job
            script_type: Type of script to execute (export, import, decimate, tag)
            params: Parameters to pass to the script
        
        Returns:
            Dictionary with execution results
        """
        # Get the base directory for the asset pipeline scripts
        base_dir = os.environ.get("ASSET_PIPELINE_PATH", "../../asset-pipeline")
        script_dir = os.path.join(base_dir, "src/automation")
        
        # Map job types to scripts
        script_map = {
            "asset-export": "export.py",
            "asset-import": "import.py",
            "asset-decimate": "decimate.py",
            "asset-tag": "tag.py"
        }
        
        if script_type not in script_map:
            raise ValueError(f"Unknown script type: {script_type}")
        
        script_path = os.path.join(script_dir, script_map[script_type])
        
        # Convert params dictionary to command line arguments
        cmd = [sys.executable, script_path]
        
        # Handle different parameter formats for each script type
        if script_type == "asset-export":
            cmd.extend([params.get("input"), params.get("output")])
            if "format" in params:
                cmd.extend(["--format", params.get("format")])
            if "quality" in params:
                cmd.extend(["--quality", str(params.get("quality"))])
                
        elif script_type == "asset-import":
            cmd.extend([params.get("source"), params.get("destination")])
            if "scale" in params:
                cmd.extend(["--scale", str(params.get("scale"))])
            if params.get("fix_orientation"):
                cmd.append("--fix-orientation")
                
        elif script_type == "asset-decimate":
            cmd.extend([params.get("input"), params.get("output")])
            if "reduction" in params:
                cmd.extend(["--reduction", str(params.get("reduction"))])
            if params.get("preserve_uvs"):
                cmd.append("--preserve-uvs")
                
        elif script_type == "asset-tag":
            cmd.append(params.get("target"))
            if "tags" in params and params["tags"]:
                cmd.extend(["--tags"] + params["tags"])
            if "category" in params:
                cmd.extend(["--category", params.get("category")])
            if params.get("replace"):
                cmd.append("--replace")
        
        logger.info(f"[{job_id}] Executing command: {' '.join(cmd)}")
        
        try:
            # Execute the script and capture output
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Process output in real-time and update progress
            stdout_lines = []
            for line in process.stdout:
                stripped_line = line.strip()
                stdout_lines.append(stripped_line)
                logger.info(f"[{job_id}] {stripped_line}")
                
                # Try to extract progress percentage from the output
                if "Progress:" in line and "%" in line:
                    try:
                        progress_text = line.split("Progress:")[1].strip()
                        percentage = int(float(progress_text.split("%")[0].strip()))
                        self.update_progress(job_id, {"percentage": percentage, "log": stripped_line})
                    except Exception:
                        pass
            
            # Wait for process to complete and get return code
            return_code = process.wait()
            
            # Process any remaining stderr output
            stderr_output = process.stderr.read()
            if stderr_output:
                for line in stderr_output.splitlines():
                    stdout_lines.append(f"ERROR: {line.strip()}")
                    logger.error(f"[{job_id}] {line.strip()}")
            
            if return_code != 0:
                raise Exception(f"Script execution failed with return code {return_code}")
                
            return {
                "success": True,
                "output": stdout_lines,
                "return_code": return_code
            }
            
        except Exception as e:
            logger.exception(f"[{job_id}] Error executing script {script_type}")
            return {
                "success": False,
                "error": str(e),
                "output": stdout_lines if 'stdout_lines' in locals() else []
            }

    def execute_pipeline(self, job_id, params):
        """
        Execute a full asset pipeline by running the scripts in sequence
        """
        logger.info(f"[{job_id}] Starting asset pipeline execution")
        results = {}
        
        try:
            # Step 1: Import
            logger.info(f"[{job_id}] Step 1/4: Importing asset")
            self.update_progress(job_id, {"percentage": 5, "log": "Step 1/4: Importing asset..."})
            
            import_params = params.get("import", {})
            import_result = self.execute_script(job_id, "asset-import", import_params)
            if not import_result.get("success", False):
                raise Exception(f"Import step failed: {import_result.get('error', 'Unknown error')}")
                
            results["import"] = import_result
            self.update_progress(job_id, {"percentage": 25, "log": "Import step completed"})
                
            # Step 2: Tag
            logger.info(f"[{job_id}] Step 2/4: Tagging asset")
            self.update_progress(job_id, {"percentage": 30, "log": "Step 2/4: Tagging asset..."})
            
            tag_params = params.get("tag", {})
            tag_result = self.execute_script(job_id, "asset-tag", tag_params)
            if not tag_result.get("success", False):
                raise Exception(f"Tag step failed: {tag_result.get('error', 'Unknown error')}")
                
            results["tag"] = tag_result
            self.update_progress(job_id, {"percentage": 50, "log": "Tag step completed"})
            
            # Step 3: Decimate
            logger.info(f"[{job_id}] Step 3/4: Decimating model")
            self.update_progress(job_id, {"percentage": 55, "log": "Step 3/4: Decimating model..."})
            
            decimate_params = params.get("decimate", {})
            decimate_result = self.execute_script(job_id, "asset-decimate", decimate_params)
            if not decimate_result.get("success", False):
                raise Exception(f"Decimate step failed: {decimate_result.get('error', 'Unknown error')}")
                
            results["decimate"] = decimate_result
            self.update_progress(job_id, {"percentage": 75, "log": "Decimate step completed"})
            
            # Step 4: Export
            logger.info(f"[{job_id}] Step 4/4: Exporting final asset")
            self.update_progress(job_id, {"percentage": 80, "log": "Step 4/4: Exporting final asset..."})
            
            export_params = params.get("export", {})
            export_result = self.execute_script(job_id, "asset-export", export_params)
            if not export_result.get("success", False):
                raise Exception(f"Export step failed: {export_result.get('error', 'Unknown error')}")
                
            results["export"] = export_result
            self.update_progress(job_id, {"percentage": 95, "log": "Export step completed"})
            
            # Complete pipeline
            logger.info(f"[{job_id}] Pipeline execution completed successfully")
            self.update_progress(job_id, {"percentage": 100, "log": "Pipeline execution completed"})
            
            return {
                "success": True,
                "message": "Asset pipeline executed successfully",
                "steps": results
            }
            
        except Exception as e:
            logger.exception(f"[{job_id}] Pipeline execution failed")
            return {
                "success": False,
                "error": str(e),
                "steps": results
            }

    def process_job(self, job_data):
        """
        Process a job from the queue with locking.
        """
        job_id = job_data.get("id")
        name = job_data.get("name")
        data = job_data.get("data", {})
        lock_key = f"{self.queue_key}:{job_id}:lock"
        
        logger.info(f"Processing job {job_id} ({name}) with exclusive lock")
        
        try:
            # Log start
            self.update_progress(
                job_id,
                {"percentage": 0, "log": f"Starting job {name} processing from Python worker"},
            )
            
            # Check if this is a pipeline job
            if name == "asset-pipeline":
                script_params = data.get("scriptParams", {})
                
                if script_params.get("pipeline"):
                    self.update_progress(job_id, {"percentage": 2, "log": "Starting asset pipeline job..."})
                    
                    result = self.execute_pipeline(job_id, script_params)
                    
                    if not result.get("success", False):
                        raise Exception(f"Pipeline execution failed: {result.get('error', 'Unknown error')}")
                    
                    output_result = {
                        "message": "Asset pipeline completed successfully",
                        "pipelineOutput": result,
                        "processedBy": "python-worker"
                    }
                    
                    self.complete_job(job_id, output_result)
                    return True
            
            # Proceed with other job types as before
            # Determine if this is a script execution job
            script_jobs = ["asset-export", "asset-import", "asset-decimate", "asset-tag"]
            
            if name in script_jobs:
                # This is a script job - extract parameters and execute script
                script_params = data.get("scriptParams", {})
                
                # Execute the script
                self.update_progress(job_id, {"percentage": 10, "log": f"Executing {name} script..."})
                
                result = self.execute_script(job_id, name, script_params)
                
                if not result.get("success", False):
                    raise Exception(f"Script execution failed: {result.get('error', 'Unknown error')}")
                    
                # Update progress based on script output
                for i, line in enumerate(result.get("output", [])):
                    progress = min(10 + int(80 * (i+1) / max(len(result.get("output", [])), 1)), 90)
                    self.update_progress(job_id, {"percentage": progress, "log": line})
                    
                # Complete the job with the script's output
                output_result = {
                    "message": f"Script {name} completed successfully",
                    "scriptOutput": result.get("output", []),
                    "scriptType": name,
                    "processedBy": "python-worker"
                }
                
                self.update_progress(job_id, {"percentage": 100, "log": "Script execution completed"})
                self.complete_job(job_id, output_result)
                
            else:
                # Process generic job as before
                # Simulate work with progress updates
                for i in range(1, 6):
                    progress = i * 20
                    time.sleep(1.0)  # Reduced for faster testing

                    log_message = f"Processing step {i}..."
                    logger.info(f"[{job_id}] {log_message}")

                    self.update_progress(
                        job_id, {"percentage": progress, "log": log_message}
                    )

                # Complete the job
                result = {
                    "message": f"Job {job_id} completed successfully by Python worker",
                    "processedData": data,
                    "processorInfo": {
                        "worker": "python",
                        "id": self.worker_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                }

                self.complete_job(job_id, result)
                
            return True

        except Exception as e:
            logger.exception(f"Error processing job {job_id}")
            self.fail_job(job_id, str(e))
            return False
        finally:
            # Always release the lock when done
            self.redis.delete(lock_key)
            logger.info(f"Released lock for job {job_id}")

    def get_next_job(self):
        """
        Get the next job from the Redis queue
        """
        # Get a job from pending queue
        raw_data = self.redis.brpoplpush(
            f"bull:{self.queue_key}:wait",
            f"bull:{self.queue_key}:processing",
            timeout=1
        )
        
        if not raw_data:
            return None
        
        # Parse the job data
        try:
            return json.loads(raw_data)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse job data: {raw_data}")
            # Return the job to the pending queue
            self.redis.rpush(f"{self.queue_key}:pending", raw_data)
            # Remove from processing queue
            self.redis.lrem(f"{self.queue_key}:processing", 1, raw_data)
            return None
    
    def update_progress(self, job_id, progress_data):
        """
        Update job progress in Redis
        """
        try:
            progress_key = f"{self.queue_key}:{job_id}:progress"
            self.redis.set(progress_key, json.dumps(progress_data))
            logger.debug(f"Updated progress for job {job_id}: {progress_data}")
        except Exception as e:
            logger.error(f"Failed to update progress for job {job_id}: {str(e)}")
    
    def complete_job(self, job_id, result_data):
        """
        Mark a job as completed
        """
        try:
            # Get the job data from processing list
            job_key = f"{self.queue_key}:{job_id}"
            self.redis.set(f"{job_key}:result", json.dumps(result_data))
            self.redis.set(f"{job_key}:status", "completed")
            
            # Move job from processing to completed queue
            job_data = None
            for item in self.redis.lrange(f"{self.queue_key}:processing", 0, -1):
                try:
                    job = json.loads(item)
                    if job.get("id") == job_id:
                        job_data = item
                        break
                except:
                    pass
            
            if job_data:
                self.redis.lrem(f"{self.queue_key}:processing", 1, job_data)
                self.redis.lpush(f"{self.queue_key}:completed", job_data)
            
            logger.info(f"Job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to mark job {job_id} as completed: {str(e)}")
    
    def fail_job(self, job_id, error_message):
        """
        Mark a job as failed
        """
        try:
            # Set job status and error
            job_key = f"{self.queue_key}:{job_id}"
            self.redis.set(f"{job_key}:status", "failed")
            self.redis.set(f"{job_key}:error", error_message)
            
            # Move job from processing to failed queue
            job_data = None
            for item in self.redis.lrange(f"{self.queue_key}:processing", 0, -1):
                try:
                    job = json.loads(item)
                    if job.get("id") == job_id:
                        job_data = item
                        break
                except:
                    pass
            
            if job_data:
                self.redis.lrem(f"{self.queue_key}:processing", 1, job_data)
                self.redis.lpush(f"{self.queue_key}:failed", job_data)
            
            logger.error(f"Job {job_id} failed: {error_message}")
            
        except Exception as e:
            logger.error(f"Failed to mark job {job_id} as failed: {str(e)}")
    
    def poll_queue(self):
        """
        Continuously poll the Redis queue for new jobs
        """
        logger.info(f"Worker {self.worker_id} started polling queue {self.queue_key}")
        
        while not self.shutdown_requested:
            try:
                # Get next job
                job_data = self.get_next_job()
                
                if job_data:
                    # Process the job
                    self.process_job(job_data)
                else:
                    # No jobs in queue, sleep before next poll
                    time.sleep(1)
            
            except KeyboardInterrupt:
                logger.info("Shutdown requested via keyboard interrupt")
                self.shutdown_requested = True
            
            except Exception as e:
                logger.exception(f"Error during queue polling: {str(e)}")
                # Sleep before retrying to avoid hammering Redis on errors
                time.sleep(5)
        
        logger.info(f"Worker {self.worker_id} stopped polling")
    
    def handle_shutdown(self, signum, frame):
        """
        Handle shutdown signals gracefully
        """
        logger.info(f"Received shutdown signal {signum}, stopping worker...")
        self.shutdown_requested = True
    
    def start(self):
        """
        Start the worker
        """
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        
        logger.info(f"Starting worker {self.worker_id}")
        self.poll_queue()


# Script entrypoint
if __name__ == "__main__":
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Asset Pipeline Worker')
    parser.add_argument('--redis', 
                        default=f"redis://{os.environ.get('REDIS_HOST', 'localhost')}:{os.environ.get('REDIS_PORT', '6379')}", 
                        help='Redis connection URL')
    parser.add_argument('--queue', default=os.environ.get('JOB_QUEUE_NAME', 'local-job-queue'),
                        help='Redis queue key prefix')
    
    args = parser.parse_args()
    
    # Create and start worker
    try:
        worker = Worker(redis_url=args.redis, queue_key=args.queue)
        worker.start()
    except Exception as e:
        logger.critical(f"Worker failed to start: {str(e)}")
        sys.exit(1)