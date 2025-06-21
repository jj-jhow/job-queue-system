import { WorkFlowStep } from "./job";

// Define the workflow steps
export const EXPORT_STEP: WorkFlowStep = {
    name: 'export',
    type: 'cpu',
    nextStep: null,
};

export const DECIMATE_STEP: WorkFlowStep = {
    name: 'decimate',
    type: 'gpu',
    nextStep: EXPORT_STEP,
};

export const TAG_STEP: WorkFlowStep = {
    name: 'tag',
    type: 'cpu',
    nextStep: DECIMATE_STEP,
};

export const IMPORT_STEP: WorkFlowStep = {
    name: 'import',
    type: 'cpu',
    nextStep: TAG_STEP,
};

export const INITIAL_WORKFLOW_STEP: WorkFlowStep = IMPORT_STEP;
