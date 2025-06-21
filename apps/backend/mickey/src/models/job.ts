// --- Workflow Definition ---
export type StepName = 'import' | 'tag' | 'decimate' | 'export';

export interface WorkFlowStep {
    name: StepName;
    type: 'cpu' | 'gpu';
    nextStep: WorkFlowStep | null;
}

// --- Job Data Interfaces ---
interface BaseJobData {
    assetId: string;
    payload: any;
}

export interface OrchestratorJobData extends BaseJobData {
    completedStep?: StepName;
    currentStep?: StepName; // For explicit start or retries
}

export interface WorkerJobData extends BaseJobData {
    currentStep: StepName; // The name of the step the worker needs to perform
}
