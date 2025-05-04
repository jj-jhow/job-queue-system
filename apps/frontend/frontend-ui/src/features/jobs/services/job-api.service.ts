import { API_URL } from '../../../core/config/constants';
import { JobData, JobSubmission, JobSubmitResponse } from '../types/job.types';

export class JobApiService {
    private baseUrl: string;
    
    constructor(baseUrl: string = API_URL) {
        this.baseUrl = baseUrl;
    }
    
    async submitJob(jobData: JobSubmission): Promise<JobSubmitResponse> {
        const response = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobData),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    }
    
    async getJobById(jobId: string): Promise<JobData> {
        const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    }
}

// Create a singleton instance
export const jobApiService = new JobApiService();