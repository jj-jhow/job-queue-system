
// --- Workflow Definition ---
type StepName = 'import' | 'tag' | 'decimate' | 'export';

interface WorkFlowStep {
    name: StepName;
    type: 'cpu' | 'gpu';
    nextStep: WorkFlowStep | null;
}
