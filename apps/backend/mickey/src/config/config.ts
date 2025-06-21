// --- Configuration ---

// --- Redis Configuration ---
export const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// --- Queue Configuration ---
export const MICKEY_INPUT_QUEUE_NAME = process.env.MICKEY_INPUT_QUEUE || 'asset-processor';
export const CPU_PROCESSOR_QUEUE_NAME = process.env.CPU_PROCESSOR_QUEUE || 'cpu-processor';
export const GPU_PROCESSOR_QUEUE_NAME = process.env.GPU_PROCESSOR_QUEUE || 'gpu-processor';
