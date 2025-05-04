import { Queue, QueueEvents, Job, JobProgress } from 'bullmq';
import { JOB_QUEUE_NAME, redisConnection } from '../../config/config';
import { JobStatus } from '../../types/job.types';
import { jobStoreService } from '../jobStore.service';
import { socketService } from '../socket.service';
import { QueueService, QueueOptions, JobResult } from './queue.interface';

export class BullMQService implements QueueService {
    private queue: Queue;
    private queueEvents: QueueEvents;
    
    constructor() {
        this.queue = new Queue(JOB_QUEUE_NAME, { connection: redisConnection });
        this.queueEvents = new QueueEvents(JOB_QUEUE_NAME, { connection: redisConnection });
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        this.queueEvents.on('error', this.handleError.bind(this));
        this.queueEvents.on('progress', this.handleProgress.bind(this));
        this.queueEvents.on('completed', this.handleCompleted.bind(this));
        this.queueEvents.on('failed', this.handleFailed.bind(this));
        this.queueEvents.on('active', this.handleActive.bind(this));
    }
    
    private handleError(err: Error): void {
        console.error('BullMQ QueueEvents Error:', err);
    }
    
    private handleProgress({ jobId, data, prev }: { jobId: string, data: JobProgress, prev?: string }, id: string): void {
        console.log(`Event id: ${id}`);
        console.log(`Job ${jobId} progress: ${data}`);
        console.log(`Job ${jobId} previous progress: ${prev}`);
        
        const currentStatus = jobStoreService.get(jobId);
        const progress = typeof data === 'number' ? data : (data as any)?.percentage ?? currentStatus?.progress ?? 0;
        
        const eventTime = new Date();
            
        const logMessage = (typeof data === 'object' && (data as any)?.log) 
            ? (data as any).log 
            : `Progress: ${progress}%`;

        const updatedStatus = jobStoreService.updateAndMerge(jobId, {
            status: 'active',
            progress: progress,
            logs: [`[${eventTime.toISOString()}] ${logMessage}`]
        });
        
        socketService.emitJobUpdate(updatedStatus);
    }
    
    private handleCompleted({ jobId, returnvalue, prev }: { jobId: string, returnvalue: string, prev?: string }, _id: string): void {
        console.log(`Event id: ${_id}`);
        console.log(`Job ${jobId} completed successfully. Result: ${returnvalue}`);
        console.log(`Job ${jobId} previous state: ${prev}`);
        
        const eventTime = new Date();
            
        const updatedStatus = jobStoreService.updateAndMerge(jobId, {
            status: 'completed',
            progress: 100,
            result: returnvalue,
            logs: [`[${eventTime.toISOString()}] Job completed successfully.`]
        });
        
        socketService.emitJobUpdate(updatedStatus);
    }
    
    private handleFailed({ jobId, failedReason, prev }: { jobId: string, failedReason: string, prev?: string }, id: string): void {
        console.log(`Event id: ${id}`);
        console.log(`Job ${jobId} failed:`, failedReason);
        console.log(`Job ${jobId} previous state: ${prev}`);
        
        const eventTime = new Date();
            
        const updatedStatus = jobStoreService.updateAndMerge(jobId, {
            status: 'failed',
            error: failedReason,
            logs: [`[${eventTime.toISOString()}] Job failed: ${failedReason}`]
        });
        
        socketService.emitJobUpdate(updatedStatus);
    }
    
    private handleActive({ jobId, prev }: { jobId: string, prev?: string }, id: string): void {
        console.log(`Event id: ${id}`);
        console.log(`Job ${jobId} is now active.`);
        console.log(`Job ${jobId} previous state: ${prev}`);
        
        const eventTime = new Date();
        
        this.getJob(jobId)
            .then(job => {
                const updatedStatus = jobStoreService.updateAndMerge(jobId, {
                    status: 'active',
                    name: job?.name,
                    timestamp: job?.timestamp,
                    logs: [`[${eventTime.toISOString()}] Job started processing.`]
                });
                
                socketService.emitJobUpdate(updatedStatus);
            })
            .catch(err => {
                console.error(`[${jobId}] Error fetching job details during 'active' event:`, err);
                
                const updatedStatus = jobStoreService.updateAndMerge(jobId, {
                    status: 'active',
                    logs: [`[${eventTime.toISOString()}] Job started processing (details fetch failed).`]
                });
                
                socketService.emitJobUpdate(updatedStatus);
            });
    }
    
    async addJob(name: string, payload: any, options: QueueOptions = {}): Promise<JobResult> {
        const defaultOptions = {
            removeOnComplete: true,
            removeOnFail: 50
        };
        
        const job = await this.queue.add(name, payload, { ...defaultOptions, ...options });
        
        const initialStatus: JobStatus = {
            id: job.id as string,
            name: name,
            status: 'waiting',
            progress: 0,
            logs: [`[${new Date().toISOString()}] Job ${job.id} queued.`],
            timestamp: job.timestamp,
        };
        
        jobStoreService.set(job.id as string, initialStatus);
        socketService.emitJobQueued(initialStatus);
        
        return this.convertToJobResult(job);
    }
    
    async getJob(jobId: string): Promise<JobResult | undefined> {
        const job = await this.queue.getJob(jobId);
        if (!job) return undefined;
        return this.convertToJobResult(job);
    }
    
    async close(): Promise<void> {
        await this.queue.close();
        await this.queueEvents.close();
    }
    
    /**
     * Helper method to convert BullMQ Job to JobResult interface
     */
    private convertToJobResult(job: Job): JobResult {
        return {
            id: job.id as string,
            name: job.name,
            data: job.data,
            timestamp: job.timestamp,
            progress: job.progress,
            returnvalue: job.returnvalue,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
            opts: job.opts
        };
    }
}

// Singleton instance 
export const bullMQService = new BullMQService();