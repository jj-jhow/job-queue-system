export interface JobProgress {
    percentage: number;
    log?: string;
}

export interface JobData {
    id: string;
    name: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown' | 'not_found' | 'processing';
    progress: number | JobProgress;
    logs: string[];
    result?: any;
    error?: string;
    timestamp?: number;
}

export interface JobSubmission {
    name: string;
    payload: any;
}

export interface JobSubmitResponse {
    message: string;
    jobId: string;
}