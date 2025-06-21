import { Job } from "bullmq";

export const processor = async (job: Job) => {
    // Simulate step processing
    await job.log(`Started step: ${job.data.currentStep}`);
    await job.updateProgress(10);

    // ... do actual work here ...
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await job.updateProgress(100);
    await job.log(`Completed step: ${job.data.currentStep}`);
    return { status: 'done', step: job.data.currentStep };
}