import { Request, Response, Router } from 'express';
import { container } from '../config/container';
import { jobStoreService } from '../services/jobStore.service';

export class JobController {
    public router: Router;
    private queueService = container.queueService;

    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.router.post('/jobs', this.createJob.bind(this));
        this.router.get('/jobs/:jobId', this.getJobById.bind(this));
        this.router.get('/jobs/:jobId/progress', this.getJobProgress.bind(this));
        this.router.get('/jobs/:jobId/logs', this.getJobLogs.bind(this));
    }

    private async createJob(req: Request, res: Response): Promise<Response> {
        try {
            const { name, payload } = req.body;

            if (!name || !payload) {
                return res.status(400).json({ message: 'Missing job name or payload' });
            }

            const job = await this.queueService.addJob(name, payload);

            const jobId = job.id;
            if (!jobId) {
                console.error('Job added but ID is missing:', job);
                return res.status(500).json({ message: 'Failed to get job ID after adding to queue' });
            }

            console.log(`Job ${jobId} (${name}) added to queue.`);

            return res.status(202).json({ message: 'Job accepted', jobId: jobId });

        } catch (error: any) {
            console.error('Error adding job:', error);
            return res.status(500).json({ message: 'Failed to add job', error: error.message });
        }
    }

    private async getJobById(req: Request, res: Response): Promise<Response> {
        const jobId = req.params.jobId;

        try {
            const job = await this.queueService.getJob(jobId);
            const cachedStatus = jobStoreService.get(jobId);

            if (!job && !cachedStatus) {
                return res.status(404).json({ message: 'Job not found' });
            }

            let currentState: string = 'unknown';
            if (job) {
                currentState = await job.getState();
            } else if (cachedStatus) {
                currentState = cachedStatus.status;
            }

            const combinedStatus = {
                id: jobId,
                name: job?.name ?? cachedStatus?.name ?? 'unknown',
                status: currentState,
                progress: job?.progress ?? cachedStatus?.progress ?? 0,
                logs: cachedStatus?.logs ?? [],
                result: job?.returnvalue ?? cachedStatus?.result,
                error: job?.failedReason ?? cachedStatus?.error,
                timestamp: job?.timestamp ?? cachedStatus?.timestamp ?? Date.now(),
            };

            return res.status(200).json(combinedStatus);

        } catch (error: any) {
            console.error(`Error getting job ${jobId}:`, error);
            return res.status(500).json({
                message: 'Failed to get job status',
                error: error.message
            });
        }
    }

    private async getJobProgress(req: Request, res: Response): Promise<Response> {
        const jobId = req.params.jobId;
        try {
            const job = await this.queueService.getJob(jobId);
            if (!job) return res.status(404).json({ error: "Job not found" });
            return res.json({ jobId, progress: job.progress });
        } catch (error: any) {
            return res.status(500).json({ message: 'Failed to get job progress', error: error.message });
        }
    }

    private async getJobLogs(req: Request, res: Response): Promise<Response> {
        const jobId = req.params.jobId;
        try {
            // Use BullMQ's getJob and getLogs if available, else fallback to jobStoreService
            const job = await this.queueService.getJob(jobId);
            if (!job) return res.status(404).json({ error: "Job not found" });
            if (typeof (job as any).getLogs === 'function') {
                const logs = await (job as any).getLogs();
                return res.json({ jobId, logs: logs.logs });
            } else {
                // fallback to jobStoreService
                const cached = jobStoreService.get(jobId);
                return res.json({ jobId, logs: cached?.logs ?? [] });
            }
        } catch (error: any) {
            return res.status(500).json({ message: 'Failed to get job logs', error: error.message });
        }
    }
}

export const jobController = new JobController();