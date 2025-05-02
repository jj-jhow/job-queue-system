// worker-service/src/worker.ts

import { Worker, Job, JobProgress } from 'bullmq';

// --- Configuration ---
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const JOB_QUEUE_NAME = 'jobQueueBullMQ'; // Must match the queue name in the backend

// --- Redis Connection Options for BullMQ ---
const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    // Add password, db, etc., if needed
};

// --- Job Processing Logic ---

/**
 * Processes a job received from the BullMQ queue.
 * Includes progress updates and simulated work.
 * @param job The BullMQ job object. Contains job.id, job.name, job.data (payload)
 */
async function processJob(job: Job): Promise<any> {
    const { id, name: jobType, data: payload } = job; // Extract data from job object
    console.log(`--- [${id}] Starting Job ---`);
    console.log(`[${id}] Processing job of type '${jobType}'... Payload:`, payload);

    // Use job.log for logging within BullMQ (optional, viewable in tools like Arena)
    await job.log(`Starting job processing for type: ${jobType}`);

    try {
        // Simulate work with progress updates
        for (let progress = 0; progress <= 100; progress += 20) {
            // Simulate delay for each step
            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay

            const logMessage = `Processing step ${progress / 20 + 1}...`;
            console.log(`[${id}] LOG: ${logMessage}`);
            await job.log(logMessage); // Log to BullMQ

            // Update progress - data can be number or object
            // Sending an object allows passing logs/messages with progress
            await job.updateProgress({ percentage: progress, log: logMessage });
            console.log(`[${id}] Progress: ${progress}%`);

            // Simulate a potential failure (for demonstration)
            // if (progress === 60 && Math.random() > 0.8) { // ~20% chance of failure
            //     throw new Error("Simulated processing error during step 3!");
            // }
        }

        // Simulate successful completion
        const result = { message: `Job ${id} completed successfully`, processedData: payload };
        await job.log(`Job finished successfully.`);
        console.log(`[${id}] Completed.`);

        // Return the result - BullMQ marks the job as completed with this value
        return result;

    } catch (error: any) {
        console.error(`[${id}] Failed: ${error.message}`);
        await job.log(`Job failed: ${error.message}`);
        // Throw the error - BullMQ will mark the job as failed with this reason
        throw error; // Re-throw the error to ensure BullMQ handles it as a failure
    } finally {
        console.log(`--- [${id}] Finished Job ---`);
    }
}

// --- Initialize BullMQ Worker ---

console.log(`Initializing BullMQ worker for queue: ${JOB_QUEUE_NAME}`);

const worker = new Worker(
    JOB_QUEUE_NAME, // Queue name to process
    processJob,     // The function to process each job
    {
        connection,
        concurrency: 1, // Number of jobs to process concurrently (adjust as needed)
        limiter: {      // Optional rate limiting
            max: 10,       // Max 10 jobs
            duration: 1000 // per 1 second
        },
        removeOnComplete: { count: 100 }, // Keep logs of last 100 completed jobs
        removeOnFail: { count: 500 }     // Keep logs of last 500 failed jobs
    }
);

// --- Worker Event Listeners (Optional but Recommended) ---

worker.on('active', (job: Job) => {
    console.log(`[${job.id}] Worker: Job active`);
});

worker.on('completed', (job: Job, result: any) => {
    console.log(`[${job.id}] Worker: Job completed successfully. Result:`, result);
});

worker.on('failed', (job: Job | undefined, error: Error) => {
    // job might be undefined if the error happened before the job instance was created
    const jobId = job ? job.id : 'unknown';
    console.error(`[${jobId}] Worker: Job failed. Error:`, error);
});

worker.on('progress', (job: Job, progress: JobProgress) => {
    // Note: Progress updates here are from *this worker*.
    // The backend listens via QueueEvents for broader progress.
    console.log(`[${job.id}] Worker: Reported progress:`, progress);
});

worker.on('error', (error: Error) => {
    // Errors in the worker instance itself (e.g., connection issues)
    console.error('Worker encountered an error:', error);
});

console.log('Worker started and waiting for jobs...');

// --- Graceful Shutdown ---
async function gracefulShutdown() {
    console.log('Worker: Initiating graceful shutdown...');
    try {
        await worker.close();
        console.log('Worker: BullMQ worker closed.');
    } catch (err) {
        console.error('Worker: Error closing BullMQ worker:', err);
    } finally {
        console.log('Worker: Shutdown complete.');
        process.exit(0);
    }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown); // Handle Ctrl+C
