// --- Configuration ---
import * as dotenv from '@dotenvx/dotenvx';
// Load environment variables from .env file
dotenv.config();


// Helper to safely access process.env with a fallback
const safeGetEnv = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue;
};

// Helper to safely access and parse an integer from process.env with a fallback
const safeGetEnvInt = (key: string, defaultValue: number): number => {
    return parseInt(process.env[key] || defaultValue.toString(), 10);
};

// Helper to safely access process.env for potentially undefined values (like passwords)
const safeGetEnvOptional = (key: string): string | undefined => {
    return process.env[key] || undefined;
};

export const REDIS_HOST = safeGetEnv('REDIS_HOST', 'localhost');
export const REDIS_PORT = safeGetEnvInt('REDIS_PORT', 6379);
export const REDIS_PASSWORD = safeGetEnvOptional('REDIS_PRIMARY_KEY');
export const JOB_QUEUE_NAME = safeGetEnv('JOB_QUEUE_NAME', 'local-job-queue');

// Redis options for BullMQ
export const redisOptions = {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        tls: REDIS_PASSWORD ? { rejectUnauthorized: false } : undefined,
    },
    concurrency: 1,
    limiter: {
        max: 10,
        duration: 1000
    },
    defaultJobOptions: {
        removeOnComplete: {
            age: 24 * 3600, // keep for 24 hours
            count: 1000     // keep up to 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // keep for 7 days
            count: 1000         // keep up to 5000 failed jobs
        }
    }
};