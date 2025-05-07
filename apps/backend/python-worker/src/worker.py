# Add these imports at the top
import subprocess
import sys
import os
from pathlib import Path

# Add this function before process_job
def execute_script(job_id, script_type, params):
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
                    return {"percentage": percentage, "log": stripped_line}
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

def execute_pipeline(job_id, params):
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
        import_result = execute_script(job_id, "asset-import", import_params)
        if not import_result.get("success", False):
            raise Exception(f"Import step failed: {import_result.get('error', 'Unknown error')}")
            
        results["import"] = import_result
        self.update_progress(job_id, {"percentage": 25, "log": "Import step completed"})
            
        # Step 2: Tag
        logger.info(f"[{job_id}] Step 2/4: Tagging asset")
        self.update_progress(job_id, {"percentage": 30, "log": "Step 2/4: Tagging asset..."})
        
        tag_params = params.get("tag", {})
        tag_result = execute_script(job_id, "asset-tag", tag_params)
        if not tag_result.get("success", False):
            raise Exception(f"Tag step failed: {tag_result.get('error', 'Unknown error')}")
            
        results["tag"] = tag_result
        self.update_progress(job_id, {"percentage": 50, "log": "Tag step completed"})
        
        # Step 3: Decimate
        logger.info(f"[{job_id}] Step 3/4: Decimating model")
        self.update_progress(job_id, {"percentage": 55, "log": "Step 3/4: Decimating model..."})
        
        decimate_params = params.get("decimate", {})
        decimate_result = execute_script(job_id, "asset-decimate", decimate_params)
        if not decimate_result.get("success", False):
            raise Exception(f"Decimate step failed: {decimate_result.get('error', 'Unknown error')}")
            
        results["decimate"] = decimate_result
        self.update_progress(job_id, {"percentage": 75, "log": "Decimate step completed"})
        
        # Step 4: Export
        logger.info(f"[{job_id}] Step 4/4: Exporting final asset")
        self.update_progress(job_id, {"percentage": 80, "log": "Step 4/4: Exporting final asset..."})
        
        export_params = params.get("export", {})
        export_result = execute_script(job_id, "asset-export", export_params)
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

# Updated process_job method
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
                
                result = execute_pipeline(job_id, script_params)
                
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
            
            result = execute_script(job_id, name, script_params)
            
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