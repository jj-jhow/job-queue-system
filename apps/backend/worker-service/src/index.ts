import { Worker } from 'bullmq';
import { JOB_QUEUE_NAME, redisOptions } from './config/config';
import { processJob } from './processors/jobProcessor';
import { gracefulShutdown } from './utils/shutdownHandler';

console.log(`Initializing worker for queue: ${JOB_QUEUE_NAME}`);

const worker = new Worker(
    JOB_QUEUE_NAME,
    processJob,
    redisOptions
);

worker.on('active', (job) => {
    console.log(`[${job.id}] Worker: Job active`);
});

worker.on('completed', (job, result) => {
    console.log(`[${job.id}] Worker: Job completed successfully. Result:`, result);
});

worker.on('failed', (job, error) => {
    const jobId = job ? job.id : 'unknown';
    console.error(`[${jobId}] Worker: Job failed. Error:`, error);
});

worker.on('progress', (job, progress) => {
    console.log(`[${job.id}] Worker: Reported progress:`, progress);
});

worker.on('error', (error) => {
    console.error('Worker encountered an error:', error);
});

console.log('Worker started and waiting for jobs...');

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);