import { Worker } from 'bullmq';
import { MICKEY_INPUT_QUEUE_NAME } from "../config/config";
import { OrchestratorJobData } from "../models/job";
import { processor } from "../processors/processor";
import { redisConnection } from "@job-queue-system/shared";

// TODO: Make sure this is actually being used throughout the code as a singleton worker instance.
export const orchestratorWorker = new Worker<OrchestratorJobData, any>(
    MICKEY_INPUT_QUEUE_NAME,
    processor,
    { connection: redisConnection }
);
