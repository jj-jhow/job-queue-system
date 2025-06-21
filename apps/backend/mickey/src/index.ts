import { QueueScheduler } from 'bullmq';
import { CPU_PROCESSOR_QUEUE_NAME, GPU_PROCESSOR_QUEUE_NAME, MICKEY_INPUT_QUEUE_NAME, REDIS_HOST, REDIS_PORT } from './config/config';
import { redisConnection } from './services/redis';
import { cpuProcessorQueue } from './queues/cpu-queue';
import { INITIAL_WORKFLOW_STEP } from './models/work-flow-step';
import { getWorkFlowPath } from './utils/work-flow-step';
import { orchestratorWorker } from './workers/orchestrator';
// import { config } from '@dotenvx/dotenvx';

// If you are using .env files, uncomment the above and below lines
// config(); // Load .env (e.g., .env, .env.local)

redisConnection.on('connect', () => console.log(`Mickey connected to Redis at ${REDIS_HOST}:${REDIS_PORT}.`));
redisConnection.on('error', (err) => console.error('Mickey Redis connection error:', err));

// --- Queue Schedulers (Required for delayed jobs, retries etc, good practice to have) ---
// One scheduler per queue that Mickey interacts with as a worker or producer if advanced features are used.
// For Mickey's worker queue:
new QueueScheduler(MICKEY_INPUT_QUEUE_NAME, { connection: redisConnection });

// --- Mickey's Worker ---
const mickeyWorker = orchestratorWorker;

mickeyWorker.on('completed', (job, result) => {
    console.log(`[Job ${job.id} | Asset ${job.data.assetId}] Mickey processing completed. Result:`, result);
});

mickeyWorker.on('failed', (job, err) => {
    console.error(`[Job ${job?.id} | Asset ${job?.data?.assetId}] Mickey processing failed: ${err.message}`, err.stack);
});

mickeyWorker.on('error', err => {
    console.error('Mickey worker encountered an error:', err);
});

console.log(`Mickey orchestrator started. Listening on queue: '${MICKEY_INPUT_QUEUE_NAME}'.`);
console.log(`Will dispatch CPU jobs to: '${CPU_PROCESSOR_QUEUE_NAME}'.`);
console.log(`Will dispatch GPU jobs to: '${GPU_PROCESSOR_QUEUE_NAME}'.`);
console.log('Processing workflow:', getWorkFlowPath(INITIAL_WORKFLOW_STEP));


// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down Mickey orchestrator...`);
    try {
        await mickeyWorker.close();
        console.log('Mickey worker closed.');
        await cpuProcessorQueue.close();
        console.log('CPU processor queue closed.');
        await cpuProcessorQueue.close();
        console.log('GPU processor queue closed.');
        await redisConnection.quit();
        console.log('Redis connection closed.');
    } catch (err) {
        console.error('Error during graceful shutdown:', err);
    }
    console.log('Mickey orchestrator shut down.');
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// --- Helper to add a test job (for development) ---
// async function addTestJob(assetId: string, initialPayload: any, startStepName?: StepName) {
//     const mickeyInputQueue = new Queue<MickeyInputJobData>(MICKEY_INPUT_QUEUE_NAME, { connection: redisConnection });
//     const jobData: MickeyInputJobData = { assetId, payload: initialPayload };
//     if (startStepName) {
//         jobData.currentStep = startStepName;
//     }
//     await mickeyInputQueue.add('new-asset-submission', jobData);
//     console.log(`Test job added for asset ${assetId} with payload:`, initialPayload, `Starting step: ${startStepName || INITIAL_WORKFLOW_STEP.name}`);
//     await mickeyInputQueue.close();
// }

// Example: To manually add a job after the server starts (for testing)
// setTimeout(() => {
//   addTestJob('asset003', { sourceFile: '/path/to/model.obj', settings: 'default' });
//   addTestJob('asset004', { sourceFile: '/path/to/image.jpg', type: 'texture' }, 'tag');
// }, 5000);