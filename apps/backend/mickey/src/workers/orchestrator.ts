import { Worker } from 'bullmq';
import { OrchestratorJobData } from "../models/job";
import { processor } from "../processors/processor";
import { redisOptions, ORCHESTRATOR_QUEUE_NAME } from "@job-queue-system/shared";

// TODO: Make sure this is actually being used throughout the code as a singleton worker instance.
export const orchestratorWorker = new Worker<OrchestratorJobData, any>(
    ORCHESTRATOR_QUEUE_NAME,
    processor,
    redisOptions
);
