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
