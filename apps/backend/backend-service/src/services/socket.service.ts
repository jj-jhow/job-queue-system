import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { JobStatus } from '../types/job.types';
import { bullMQService } from './queue/bullmq.service';
import { jobStoreService } from './jobStore.service';

export class SocketService {
    private io!: SocketIOServer;
    
    initialize(server: http.Server): void {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE"],
                allowedHeaders: ["Content-Type"],
            },
            transports: ["websocket", "polling"] // Use WebSocket and polling for compatibility
        });
        
        this.setupEventHandlers();
    }
    
    private setupEventHandlers(): void {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
            
            socket.on('getJobStatus', this.handleGetJobStatus.bind(this, socket));
        });
    }
    
    private async handleGetJobStatus(socket: any, jobId: string): Promise<void> {
        try {
            const job = await bullMQService.getJob(jobId);
            const cachedStatus = jobStoreService.get(jobId);
            
            if (!job && !cachedStatus) {
                socket.emit('jobStatusUpdate', { id: jobId, status: 'not_found' });
                return;
            }
            
            let currentState: JobStatus['status'] = 'unknown';
            if (job) { 
                currentState = await job.getState() as JobStatus['status']; 
            } else if (cachedStatus) { 
                currentState = cachedStatus.status; 
            }

            const combinedStatus: JobStatus = {
                id: jobId,
                name: job?.name ?? cachedStatus?.name ?? 'unknown',
                status: currentState,
                progress: job?.progress ?? cachedStatus?.progress ?? 0,
                logs: cachedStatus?.logs ?? [],
                result: job?.returnvalue ?? cachedStatus?.result,
                error: job?.failedReason ?? cachedStatus?.error,
                timestamp: job?.timestamp ?? cachedStatus?.timestamp ?? Date.now(),
            };
            
            socket.emit('jobStatusUpdate', combinedStatus);
            
        } catch (error: any) {
            console.error(`WS: Error getting job ${jobId}:`, error);
            socket.emit('jobStatusError', { 
                jobId, 
                message: 'Failed to retrieve job status', 
                error: error.message 
            });
        }
    }
    
    emitJobUpdate(jobStatus: JobStatus): void {
        if (this.io) {
            this.io.emit('jobStatusUpdate', jobStatus);
            console.log(`[${jobStatus.id}] Broadcasted update:`, jobStatus);
        }
    }
    
    emitJobQueued(jobStatus: JobStatus): void {
        if (this.io) {
            this.io.emit('jobQueued', jobStatus);
        }
    }
}

// Singleton instance
export const socketService = new SocketService();