import { JobStatus } from '../types/job.types';

export class JobStoreService {
    private jobStore: Map<string, JobStatus> = new Map();
    
    get(jobId: string): JobStatus | undefined {
        return this.jobStore.get(jobId);
    }
    
    set(jobId: string, jobStatus: JobStatus): void {
        this.jobStore.set(jobId, jobStatus);
    }
    
    delete(jobId: string): boolean {
        return this.jobStore.delete(jobId);
    }
    
    updateAndMerge(jobId: string, updates: Partial<JobStatus>): JobStatus {
        const currentStatus = this.jobStore.get(jobId) || {
            id: jobId,
            name: 'unknown',
            status: 'active',
            progress: 0,
            logs: [],
            timestamp: Date.now() // Use current time if creating new cache entry
        };

        const newStatus = {
            ...currentStatus,
            ...updates,
            logs: updates.logs ? [...currentStatus.logs, ...updates.logs] : currentStatus.logs
        };

        if (currentStatus.name === 'unknown' && updates.name) {
            newStatus.name = updates.name;
        }
        
        // Ensure timestamp isn't overwritten by updates unless explicitly provided
        if (!updates.timestamp) {
            newStatus.timestamp = currentStatus.timestamp;
        }

        this.jobStore.set(jobId, newStatus);
        return newStatus;
    }
}

// Singleton instance
export const jobStoreService = new JobStoreService();