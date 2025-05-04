// --- Data Structures ---
export interface JobStatus {
    id: string;
    name: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown';
    progress: string | boolean | number | object;
    logs: string[];
    result?: any;
    error?: string;
    timestamp: number; // Job creation timestamp from BullMQ job
}