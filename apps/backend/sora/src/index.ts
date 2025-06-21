import { cpuWorker } from "./workers/cpuWorker";

// --- Sora's Worker ---
const soraWorker = cpuWorker;

soraWorker.on('completed', (job) => {
    console.log(`[CPU Worker] Job ${job.id} completed.`);
});

soraWorker.on('failed', (job, err) => {
    console.error(`[CPU Worker] Job ${job?.id} failed:`, err);
});

soraWorker.on('error', (err) => {
    console.error('Sora worker encountered an error:', err);
});