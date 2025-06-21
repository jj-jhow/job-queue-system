import { Job } from "bullmq";
import { OrchestratorJobData, WorkerJobData, WorkFlowStep } from "../models/job";
import { cpuProcessorQueue } from "../queues/cpu-queue";
import { gpuProcessorQueue } from "../queues/gpu-queue";
import { findWorkFlowStepByName } from "../utils/work-flow-step";
import { INITIAL_WORKFLOW_STEP } from "../models/work-flow-step";
import { setJobProgress, appendJobLog, clearJobProgressAndLogs } from "../services/redis";

export const processor = async (job: Job<OrchestratorJobData>) => {
    const { assetId, payload, completedStep, currentStep } = job.data;
    const logPrefix = `[Job ${job.id} | Asset ${assetId}]`;
    const jobId = job.id?.toString() || assetId;
    // Progress mapping: import=0-25, tag=25-50, decimate=50-75, export=75-100
    const stepProgressMap: Record<string, [number, number]> = {
        import: [0, 25],
        tag: [25, 50],
        decimate: [50, 75],
        export: [75, 100],
    };
    // On new job, clear previous progress/logs
    if (!completedStep && !currentStep) {
        await clearJobProgressAndLogs(jobId);
        await setJobProgress(jobId, 0);
        await appendJobLog(jobId, `${logPrefix} Job started.`);
    }

    let currentProcessingWfStep: WorkFlowStep | null = null;
    let dataForNextStep = payload;

    if (completedStep) {
        console.log(`${logPrefix} Step '${completedStep}' reported as completed.`);
        await appendJobLog(jobId, `${logPrefix} Step '${completedStep}' completed.`);
        // Set progress to end of completed step
        const [start, end] = stepProgressMap[completedStep] || [0, 0];
        await setJobProgress(jobId, end);

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

    // Set progress to start of new step
    const [stepStart] = stepProgressMap[currentProcessingWfStep.name] || [0, 0];
    await setJobProgress(jobId, stepStart);
    await appendJobLog(jobId, `${logPrefix} Routing to step '${currentProcessingWfStep.name}'.`);

    const jobDataForWorker: WorkerJobData = {
        assetId,
        currentStep: currentProcessingWfStep.name,
        payload: dataForNextStep,
    };

    const workerJobName = `${currentProcessingWfStep.name}-task`;
    console.log(`${logPrefix} Routing to step '${currentProcessingWfStep.name}'.`);

    if (currentProcessingWfStep.type === 'cpu') {
        await cpuProcessorQueue.add(workerJobName, jobDataForWorker);
        await appendJobLog(jobId, `${logPrefix} Sent to CPU queue for step '${currentProcessingWfStep.name}'.`);
    } else if (currentProcessingWfStep.type === 'gpu') {
        await gpuProcessorQueue.add(workerJobName, jobDataForWorker);
        await appendJobLog(jobId, `${logPrefix} Sent to GPU queue for step '${currentProcessingWfStep.name}'.`);
    } else {
        // Should be unreachable with TypeScript checking WorkFlowStep.type
        const exhaustiveCheck: never = currentProcessingWfStep.type;
        console.error(`${logPrefix} Error: Unhandled step type '${exhaustiveCheck}'. This should not happen.`);
        throw new Error(`Unhandled step type: ${exhaustiveCheck}`);
    }
    return { status: 'RoutedToWorker', assetId, routedToStep: currentProcessingWfStep.name };
}
