import { WorkFlowStep } from "../models/job";
import { DECIMATE_STEP, EXPORT_STEP, IMPORT_STEP, TAG_STEP } from "../models/work-flow-step";

export const getWorkFlowPath = (step: WorkFlowStep): string[] => {
    const path: string[] = [];
    let current: WorkFlowStep | null = step;
    while (current) {
        path.push(current.name);
        current = current.nextStep;
    }
    return path;
}

export const findWorkFlowStepByName = (stepName: string): WorkFlowStep | null => {
    switch (stepName) {
        case 'import':
            return IMPORT_STEP;
        case 'tag':
            return TAG_STEP;
        case 'decimate':
            return DECIMATE_STEP;
        case 'export':
            return EXPORT_STEP;
        default:
            return null;
    }
}
