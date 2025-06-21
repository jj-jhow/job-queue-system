import { Queue } from "bullmq";
import { WorkerJobData } from "../models/job";
import { GPU_PROCESSOR_QUEUE_NAME } from "../config/config";
import { redisConnection } from "../services/redis";

// TODO: Make sure this is actually being used throughout the code as a singleton queue instance.
export const gpuProcessorQueue = new Queue<WorkerJobData>(GPU_PROCESSOR_QUEUE_NAME, { connection: redisConnection });
