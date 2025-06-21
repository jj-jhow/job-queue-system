import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '../config/config';

// --- Redis Connection ---
// BullMQ uses ioredis. Ensure ioredis is installed (npm install ioredis)
// Your package.json lists "redis": "^3.0.0". This should ideally be "ioredis".
const connectionOpts = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Recommended for BullMQ
};

export const redisConnection = new IORedis(connectionOpts);

// --- Job Progress & Log Keys ---
export function getJobProgressKey(jobId: string) {
    return `job:${jobId}:progress`;
}

export function getJobLogsKey(jobId: string) {
    return `job:${jobId}:logs`;
}

// Set job progress (0-100)
export async function setJobProgress(jobId: string, percent: number) {
    await redisConnection.hset(getJobProgressKey(jobId), 'progress', percent.toString());
}

// Get job progress
export async function getJobProgress(jobId: string): Promise<number> {
    const val = await redisConnection.hget(getJobProgressKey(jobId), 'progress');
    return val ? parseInt(val, 10) : 0;
}

// Append a log line
export async function appendJobLog(jobId: string, message: string) {
    await redisConnection.rpush(getJobLogsKey(jobId), message);
}

// Get all logs
export async function getJobLogs(jobId: string): Promise<string[]> {
    return await redisConnection.lrange(getJobLogsKey(jobId), 0, -1);
}

// Optionally, clear logs/progress (for job cleanup)
export async function clearJobProgressAndLogs(jobId: string) {
    await redisConnection.del(getJobProgressKey(jobId));
    await redisConnection.del(getJobLogsKey(jobId));
}
