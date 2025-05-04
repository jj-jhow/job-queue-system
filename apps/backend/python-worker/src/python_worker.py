#!/usr/bin/env python3
"""
Python worker for BullMQ job queue system.
This worker connects to the same Redis queue used by BullMQ and processes jobs.
"""
import os
import json
import time
import uuid
import signal
import logging
import argparse
from datetime import datetime
import redis
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()  # Load environment variables from .env file if present

# Redis connection settings
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
JOB_QUEUE_NAME = os.getenv("JOB_QUEUE_NAME", "jobQueueBullMQ")

# Worker settings
WORKER_ID = f"python-worker-{uuid.uuid4()}"
POLLING_INTERVAL = 1  # seconds between checks for new jobs
CONCURRENCY = 1  # number of jobs to process concurrently
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("python-worker")

# Flag to control graceful shutdown
running = True


class BullMQWorker:
    """
    Python implementation of a BullMQ worker.
    Connects to Redis and processes jobs from the BullMQ queue.
    """

    def __init__(self, redis_conn, queue_name, worker_id):
        self.redis = redis_conn
        self.queue_name = queue_name
        self.worker_id = worker_id
        self.queue_key = f"bull:{queue_name}"
        self.active_key = f"{self.queue_key}:active"
        self.wait_key = f"{self.queue_key}:wait"
        self.completed_key = f"{self.queue_key}:completed"
        self.failed_key = f"{self.queue_key}:failed"

        logger.info(f"Initialized worker {worker_id} for queue {queue_name}")

    def get_next_job(self):
        """
        Try to get the next job from the queue with exclusive locking.
        """
        try:
            # Get the first job from the wait list
            job_ids = self.redis.lrange(self.wait_key, -1, -1)
            
            if not job_ids:
                return None
                
            job_id = job_ids[0].decode("utf-8")
            
            # Try to acquire a lock for this job
            lock_key = f"{self.queue_key}:{job_id}:lock"
            # Set lock with expiration of 60 seconds (to prevent deadlocks)
            acquired = self.redis.set(lock_key, self.worker_id, nx=True, ex=60)
            
            if not acquired:
                logger.info(f"Job {job_id} is already being processed by another worker")
                return None
                
            # Get the job data
            job_key = f"{self.queue_key}:{job_id}"
            job_data_raw = self.redis.hgetall(job_key)

            if not job_data_raw:
                logger.warning(f"Job ID {job_id} found in wait list but no data found")
                return None

            # Convert bytes to strings and parse JSON fields
            job_data = {}
            for key, value in job_data_raw.items():
                key_str = key.decode("utf-8")
                if key_str == "data":
                    job_data[key_str] = json.loads(value.decode("utf-8"))
                else:
                    try:
                        job_data[key_str] = value.decode("utf-8")
                    except (UnicodeDecodeError, AttributeError):
                        job_data[key_str] = value

            job_data["id"] = job_id

            # Simulate moving to active - in a real implementation we would use RPOPLPUSH atomically
            self.redis.lrem(self.wait_key, 1, job_id.encode("utf-8"))
            self.redis.lpush(self.active_key, job_id)

            # Publish a job active event
            event_data = json.dumps({"jobId": job_id, "prev": "wait"})
            self.redis.publish(f"bull:{self.queue_name}:events", f"active@{event_data}")

            logger.info(f"Got job {job_id} from queue")
            return job_data

        except Exception as e:
            logger.error(f"Error getting next job: {e}")
            return None

    def update_progress(self, job_id, progress):
        """
        Update the progress of a job.

        Args:
            job_id (str): The ID of the job
            progress (int|dict): Progress value (0-100) or dict with percentage and additional info
        """
        try:
            # Convert progress to string if it's a number
            if isinstance(progress, (int, float)):
                progress_data = progress
            else:
                progress_data = progress

            # Update the job progress in Redis
            job_key = f"{self.queue_key}:{job_id}"
            self.redis.hset(job_key, "progress", json.dumps(progress_data))

            # Publish a progress event
            event_data = json.dumps({"jobId": job_id, "data": progress_data})
            self.redis.publish(
                f"bull:{self.queue_name}:events", f"progress@{event_data}"
            )

            logger.info(f"Updated progress for job {job_id}: {progress}")
        except Exception as e:
            logger.error(f"Error updating progress for job {job_id}: {e}")

    def complete_job(self, job_id, result=None):
        """
        Mark a job as completed.

        Args:
            job_id (str): The ID of the job
            result (any): The result of the job (will be serialized to JSON)
        """
        try:
            job_key = f"{self.queue_key}:{job_id}"

            # Update job data
            if result is not None:
                result_json = json.dumps(result)
                self.redis.hset(job_key, "returnvalue", result_json)

            # Move job from active to completed
            self.redis.lrem(self.active_key, 1, job_id)
            self.redis.lpush(self.completed_key, job_id)

            # Publish completion event
            event_data = json.dumps({"jobId": job_id, "returnvalue": result})
            self.redis.publish(
                f"bull:{self.queue_name}:events", f"completed@{event_data}"
            )

            logger.info(f"Marked job {job_id} as completed with result: {result}")
        except Exception as e:
            logger.error(f"Error completing job {job_id}: {e}")

    def fail_job(self, job_id, error):
        """
        Mark a job as failed.

        Args:
            job_id (str): The ID of the job
            error (str): The error message
        """
        try:
            job_key = f"{self.queue_key}:{job_id}"

            # Update job data
            self.redis.hset(job_key, "failedReason", str(error))

            # Move job from active to failed
            self.redis.lrem(self.active_key, 1, job_id)
            self.redis.lpush(self.failed_key, job_id)

            # Publish failure event
            event_data = json.dumps({"jobId": job_id, "failedReason": str(error)})
            self.redis.publish(f"bull:{self.queue_name}:events", f"failed@{event_data}")

            logger.info(f"Marked job {job_id} as failed: {error}")
        except Exception as e:
            logger.error(f"Error failing job {job_id}: {e}")

    def process_job(self, job_data):
        """
        Process a job from the queue with locking.
        """
        job_id = job_data.get("id")
        name = job_data.get("name")
        data = job_data.get("data")
        lock_key = f"{self.queue_key}:{job_id}:lock"
        
        logger.info(f"Processing job {job_id} ({name}) with exclusive lock")
        
        try:
            # Log start
            self.update_progress(
                job_id,
                {"percentage": 0, "log": "Starting job processing from Python worker"},
            )

            # Simulate work with progress updates
            for i in range(1, 6):
                progress = i * 20
                time.sleep(10.0)  # Simulate work

                log_message = f"Processing step {i}..."
                logger.info(f"[{job_id}] {log_message}")

                self.update_progress(
                    job_id, {"percentage": progress, "log": log_message}
                )

                # Optional: Simulate a random failure
                # import random
                # if progress == 60 and random.random() > 0.8:
                #    raise Exception("Simulated processing error during step 3!")

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


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    global running
    logger.info(f"Received signal {signum}, shutting down...")
    running = False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Python worker for BullMQ job queue")
    parser.add_argument("--host", default=REDIS_HOST, help="Redis host")
    parser.add_argument("--port", type=int, default=REDIS_PORT, help="Redis port")
    parser.add_argument("--queue", default=JOB_QUEUE_NAME, help="BullMQ queue name")
    args = parser.parse_args()

    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Connect to Redis
    redis_client = redis.Redis(
        host=args.host,
        port=args.port,
        decode_responses=False,  # Keep raw bytes for flexibility
    )

    try:
        # Test Redis connection
        redis_client.ping()
        logger.info(f"Connected to Redis at {args.host}:{args.port}")
    except redis.ConnectionError as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return 1

    # Create the worker
    worker = BullMQWorker(redis_client, args.queue, WORKER_ID)

    logger.info(f"Python worker started with ID {WORKER_ID}")
    logger.info(f"Monitoring queue '{args.queue}' on Redis at {args.host}:{args.port}")
    logger.info("Waiting for jobs...")

    try:
        # Main work loop
        while running:
            job = worker.get_next_job()
            if job:
                worker.process_job(job)
            else:
                time.sleep(POLLING_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
    finally:
        logger.info("Worker shutting down...")
        redis_client.close()

    logger.info("Worker stopped")
    return 0


if __name__ == "__main__":
    exit(main())
