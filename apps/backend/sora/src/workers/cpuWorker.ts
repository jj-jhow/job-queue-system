import { Worker } from 'bullmq';
import { redisConnection, CPU_PROCESSOR_QUEUE_NAME } from "@job-queue-system/shared";
import { processor } from '../processors/processor';

// TODO: Make sure this is actually being used throughout the code as a singleton worker instance.
export const cpuWorker = new Worker(
  CPU_PROCESSOR_QUEUE_NAME,
  processor,
  { connection: redisConnection }
);
