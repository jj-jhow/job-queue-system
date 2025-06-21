import { Queue } from "bullmq";
import { WorkerJobData } from "../models/job";
import { CPU_PROCESSOR_QUEUE_NAME } from "../config/config";
import { redisConnection } from "../services/redis";

// TODO: Make sure this is actually being used throughout the code as a singleton queue instance.
export const cpuProcessorQueue = new Queue<WorkerJobData>(CPU_PROCESSOR_QUEUE_NAME, { connection: redisConnection });
