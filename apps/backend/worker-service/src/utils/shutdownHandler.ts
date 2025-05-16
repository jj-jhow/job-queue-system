import { Worker } from 'bullmq';

export async function gracefulShutdown(worker: Worker) {
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