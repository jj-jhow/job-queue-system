import { Worker, Queue, Job, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
// import { config } from '@dotenvx/dotenvx';

// If you are using .env files, uncomment the above and below lines
// config(); // Load .env (e.g., .env, .env.local)

// --- Configuration ---
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const MICKEY_INPUT_QUEUE_NAME = process.env.MICKEY_INPUT_QUEUE || 'asset-processor';
const CPU_PROCESSOR_QUEUE_NAME = process.env.CPU_PROCESSOR_QUEUE || 'cpu-processor';
const GPU_PROCESSOR_QUEUE_NAME = process.env.GPU_PROCESSOR_QUEUE || 'gpu-processor';

// Define the workflow steps
const exportStep: WorkFlowStep = {
    name: 'export',
    type: 'cpu',
    nextStep: null,
};

const decimateStep: WorkFlowStep = {
    name: 'decimate',
    type: 'gpu',
    nextStep: exportStep,
};

const tagStep: WorkFlowStep = {
    name: 'tag',
    type: 'cpu',
    nextStep: decimateStep,
};

const importStep: WorkFlowStep = {
    name: 'import',
    type: 'cpu',
    nextStep: tagStep,
};

const INITIAL_WORKFLOW_STEP: WorkFlowStep = importStep;

// --- Job Data Interfaces ---
interface BaseJobData {
    assetId: string;
    payload: any;
}
interface AssetProcessorJob extends Job {
    data: BaseJobData;
}

interface MickeyInputJobData extends BaseJobData {
    completedStep?: StepName;
    currentStep?: StepName; // For explicit start or retries
}

interface WorkerJobData extends BaseJobData {
    currentStep: StepName; // The name of the step the worker needs to perform
}

// --- Redis Connection ---
// BullMQ uses ioredis. Ensure ioredis is installed (npm install ioredis)
// Your package.json lists "redis": "^3.0.0". This should ideally be "ioredis".
const connectionOpts = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Recommended for BullMQ
};
const redisConnection = new IORedis(connectionOpts);

redisConnection.on('connect', () => console.log(`Mickey connected to Redis at ${REDIS_HOST}:${REDIS_PORT}.`));
redisConnection.on('error', (err) => console.error('Mickey Redis connection error:', err));

// --- Queue Schedulers (Required for delayed jobs, retries etc, good practice to have) ---
// One scheduler per queue that Mickey interacts with as a worker or producer if advanced features are used.
// For Mickey's worker queue:
new QueueScheduler(MICKEY_INPUT_QUEUE_NAME, { connection: redisConnection });

// --- Queues Mickey will send jobs to ---
const cpuProcessorQueue = new Queue<WorkerJobData>(CPU_PROCESSOR_QUEUE_NAME, { connection: redisConnection });
const gpuProcessorQueue = new Queue<WorkerJobData>(GPU_PROCESSOR_QUEUE_NAME, { connection: redisConnection });

// --- Mickey's Worker ---
const mickeyWorker = new Worker<MickeyInputJobData, any>(
    MICKEY_INPUT_QUEUE_NAME,
    async (job: Job<MickeyInputJobData>) => {
        const { assetId, payload, completedStep: completedStepName, currentStep: explicitCurrentStepName } = job.data;
        const logPrefix = `[Job ${job.id} | Asset ${assetId}]`;
        console.log(`${logPrefix} Received. Data:`, JSON.stringify(job.data));

        let currentProcessingWfStep: WorkFlowStep | null = null;
        let dataForNextStep = payload;

        if (completedStepName) {
            console.log(`${logPrefix} Step '${completedStepName}' reported as completed.`);
            const completedWfStepNode = findWorkflowStepByName(completedStepName);

            if (!completedWfStepNode) {
                console.error(`${logPrefix} Error: Unknown completed step '${completedStepName}'.`);
                throw new Error(`Unknown completed step: ${completedStepName}`);
            }

            if (completedWfStepNode.nextStep) {
                currentProcessingWfStep = completedWfStepNode.nextStep;
                console.log(`${logPrefix} Next step is '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
            } else {
                console.log(`${logPrefix} All processing steps completed. Last step was '${completedStepName}'.`);
                return { status: 'WorkflowComplete', assetId, finalPayload: payload };
            }
        } else if (explicitCurrentStepName) {
            console.log(`${logPrefix} Job has explicit current step: '${explicitCurrentStepName}'.`);
            currentProcessingWfStep = findWorkflowStepByName(explicitCurrentStepName);
            if (!currentProcessingWfStep) {
                console.error(`${logPrefix} Error: Invalid explicit step '${explicitCurrentStepName}'.`);
                throw new Error(`Invalid explicit step: ${explicitCurrentStepName}`);
            }
            console.log(`${logPrefix} Starting at explicit step '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
        } else {
            console.log(`${logPrefix} New job. Starting with the first step.`);
            currentProcessingWfStep = INITIAL_WORKFLOW_STEP;
            if (!currentProcessingWfStep) {
                console.error(`${logPrefix} Error: No initial processing step defined.`);
                throw new Error("No initial processing step defined.");
            }
            console.log(`${logPrefix} First step is '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
        }

        if (!currentProcessingWfStep) {
            console.warn(`${logPrefix} No current processing step determined. This may indicate an issue or the end of the workflow if not caught earlier.`);
            throw new Error("Could not determine current processing step for the workflow.");
        }

        const jobDataForWorker: WorkerJobData = {
            assetId,
            currentStep: currentProcessingWfStep.name,
            payload: dataForNextStep,
        };

        const workerJobName = `${currentProcessingWfStep.name}-task`;
        console.log(`${logPrefix} Routing to step '${currentProcessingWfStep.name}'.`);

        if (currentProcessingWfStep.type === 'cpu') {
            await cpuProcessorQueue.add(workerJobName, jobDataForWorker);
            console.log(`${logPrefix} Sent to CPU queue ('${CPU_PROCESSOR_QUEUE_NAME}') for step '${currentProcessingWfStep.name}'.`);
        } else if (currentProcessingWfStep.type === 'gpu') {
            await gpuProcessorQueue.add(workerJobName, jobDataForWorker);
            console.log(`${logPrefix} Sent to GPU queue ('${GPU_PROCESSOR_QUEUE_NAME}') for step '${currentProcessingWfStep.name}'.`);
        } else {
            // Should be unreachable with TypeScript checking WorkFlowStep.type
            const exhaustiveCheck: never = currentProcessingWfStep.type;
            console.error(`${logPrefix} Error: Unhandled step type '${exhaustiveCheck}'. This should not happen.`);
            throw new Error(`Unhandled step type: ${exhaustiveCheck}`);
        }
        return { status: 'RoutedToWorker', assetId, routedToStep: currentProcessingWfStep.name };
    },
    { connection: redisConnection, autorun: true }
);

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
console.log('Processing workflow:', getWorkflowPath(INITIAL_WORKFLOW_STEP));


// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down Mickey orchestrator...`);
    try {
        await mickeyWorker.close();
        console.log('Mickey worker closed.');
        await cpuProcessorQueue.close();
        console.log('CPU processor queue closed.');
        await gpuProcessorQueue.close();
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
async function addTestJob(assetId: string, initialPayload: any, startStepName?: StepName) {
    const mickeyInputQueue = new Queue<MickeyInputJobData>(MICKEY_INPUT_QUEUE_NAME, { connection: redisConnection });
    const jobData: MickeyInputJobData = { assetId, payload: initialPayload };
    if (startStepName) {
        jobData.currentStep = startStepName;
    }
    await mickeyInputQueue.add('new-asset-submission', jobData);
    console.log(`Test job added for asset ${assetId} with payload:`, initialPayload, `Starting step: ${startStepName || INITIAL_WORKFLOW_STEP.name}`);
    await mickeyInputQueue.close();
}

// Example: To manually add a job after the server starts (for testing)
// setTimeout(() => {
//   addTestJob('asset003', { sourceFile: '/path/to/model.obj', settings: 'default' });
//   addTestJob('asset004', { sourceFile: '/path/to/image.jpg', type: 'texture' }, 'tag');
// }, 5000);