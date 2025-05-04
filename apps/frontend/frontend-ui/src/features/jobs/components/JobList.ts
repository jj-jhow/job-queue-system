import { JobData } from '../types/job.types';
import { JobCardComponent } from './JobCard';
import { websocketService } from '../../../shared/services/websocket.service';

export class JobListComponent {
    private jobCardComponent: JobCardComponent;
    private jobs: Map<string, JobData> = new Map();
    
    constructor(containerId: string) {
        this.jobCardComponent = new JobCardComponent(containerId);
        
        // Set up event listeners for WebSocket updates
        websocketService.on('jobStatusUpdate', this.handleJobStatusUpdate.bind(this));
        websocketService.on('jobQueued', this.handleJobQueued.bind(this));
    }
    
    private handleJobStatusUpdate(jobData: JobData): void {
        console.log('Job status update received:', jobData);
        this.updateJob(jobData);
    }
    
    private handleJobQueued(jobData: JobData): void {
        console.log('Job queued update received:', jobData);
        this.updateJob(jobData);
    }
    
    private updateJob(jobData: JobData): void {
        // Store the job data
        const existingJob = this.jobs.get(jobData.id);
        
        // Merge with existing data if present
        if (existingJob) {
            // Special handling for logs (append rather than replace)
            if (existingJob.logs && jobData.logs) {
                jobData.logs = [...existingJob.logs, ...jobData.logs.filter(log => 
                    !existingJob.logs.includes(log))];
            }
        }
        
        this.jobs.set(jobData.id, jobData);
        
        // Update the UI
        this.jobCardComponent.updateJobDisplay(jobData);
    }
}