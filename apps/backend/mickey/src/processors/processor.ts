import { Job } from "bullmq";
import { OrchestratorJobData, WorkerJobData, WorkFlowStep } from "../models/job";
import { CPU_PROCESSOR_QUEUE_NAME, GPU_PROCESSOR_QUEUE_NAME } from "../config/config";
import { cpuProcessorQueue } from "../queues/cpu-queue";
import { gpuProcessorQueue } from "../queues/gpu-queue";
import { findWorkFlowStepByName } from "../utils/work-flow-step";
import { INITIAL_WORKFLOW_STEP } from "../models/work-flow-step";

export const processor = async (job: Job<OrchestratorJobData>) => {
    const { assetId, payload, completedStep, currentStep } = job.data;
    const logPrefix = `[Job ${job.id} | Asset ${assetId}]`;
    console.log(`${logPrefix} Received. Data:`, JSON.stringify(job.data));

    let currentProcessingWfStep: WorkFlowStep | null = null;
    let dataForNextStep = payload;

    if (completedStep) {
        console.log(`${logPrefix} Step '${completedStep}' reported as completed.`);
        const completedWfStepNode = findWorkFlowStepByName(completedStep);

        if (!completedWfStepNode) {
            console.error(`${logPrefix} Error: Unknown completed step '${completedStep}'.`);
            throw new Error(`Unknown completed step: ${completedStep}`);
        }

        if (completedWfStepNode.nextStep) {
            currentProcessingWfStep = completedWfStepNode.nextStep;
            console.log(`${logPrefix} Next step is '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
        } else {
            console.log(`${logPrefix} All processing steps completed. Last step was '${completedStep}'.`);
            return { status: 'WorkflowComplete', assetId, finalPayload: payload };
        }
    } else if (currentStep) {
        console.log(`${logPrefix} Job has explicit current step: '${currentStep}'.`);
        currentProcessingWfStep = findWorkFlowStepByName(currentStep);
        if (!currentProcessingWfStep) {
            console.error(`${logPrefix} Error: Invalid explicit step '${currentStep}'.`);
            throw new Error(`Invalid explicit step: ${currentStep}`);
        }
        console.log(`${logPrefix} Starting at explicit step '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
    } else {
        console.log(`${logPrefix} New job. Starting with the first step.`);
        currentProcessingWfStep = INITIAL_WORKFLOW_STEP;
        if (!currentProcessingWfStep) {
            console.error(`${logPrefix} Error: No initial processing step defined.`);
            throw new Error("No initial processing step defined.");
        }
        console.log(`${logPrefix} First step is '${currentProcessingWfStep.name}' (type: ${currentProcessingWfStep.type}).`);
    }

    if (!currentProcessingWfStep) {
        console.warn(`${logPrefix} No current processing step determined. This may indicate an issue or the end of the workflow if not caught earlier.`);
        throw new Error("Could not determine current processing step for the workflow.");
    }

    const jobDataForWorker: WorkerJobData = {
        assetId,
        currentStep: currentProcessingWfStep.name,
        payload: dataForNextStep,
    };

    const workerJobName = `${currentProcessingWfStep.name}-task`;
    console.log(`${logPrefix} Routing to step '${currentProcessingWfStep.name}'.`);

    if (currentProcessingWfStep.type === 'cpu') {
        await cpuProcessorQueue.add(workerJobName, jobDataForWorker);
        console.log(`${logPrefix} Sent to CPU queue ('${CPU_PROCESSOR_QUEUE_NAME}') for step '${currentProcessingWfStep.name}'.`);
    } else if (currentProcessingWfStep.type === 'gpu') {
        await gpuProcessorQueue.add(workerJobName, jobDataForWorker);
        console.log(`${logPrefix} Sent to GPU queue ('${GPU_PROCESSOR_QUEUE_NAME}') for step '${currentProcessingWfStep.name}'.`);
    } else {
        // Should be unreachable with TypeScript checking WorkFlowStep.type
        const exhaustiveCheck: never = currentProcessingWfStep.type;
        console.error(`${logPrefix} Error: Unhandled step type '${exhaustiveCheck}'. This should not happen.`);
        throw new Error(`Unhandled step type: ${exhaustiveCheck}`);
    }
    return { status: 'RoutedToWorker', assetId, routedToStep: currentProcessingWfStep.name };
}
