// --- Configuration ---
export const PORT = process.env.PORT || 3000;
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
export const JOB_QUEUE_NAME = 'jobQueueBullMQ';

// Redis connection config for BullMQ
export const redisConnection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
};