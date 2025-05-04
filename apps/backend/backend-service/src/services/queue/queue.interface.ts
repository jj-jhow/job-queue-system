export interface JobResult {
    id: string;
    [key: string]: any;
}

export interface QueueOptions {
    removeOnComplete?: boolean | number | { count: number };
    removeOnFail?: boolean | number | { count: number };
    priority?: number;
    delay?: number;
    attempts?: number;
    timeout?: number;
    [key: string]: any;
}

export interface QueueService {
    /**
     * Add a new job to the queue
     * 
     * @param name The name of the job
     * @param payload Data to be processed by the job
     * @param options Additional job options
     * @returns Promise resolving to the job result
     */
    addJob(name: string, payload: any, options?: QueueOptions): Promise<JobResult>;
    
    /**
     * Retrieve a job by ID
     * 
     * @param jobId The ID of the job to retrieve
     * @returns Promise resolving to the job data or undefined if not found
     */
    getJob(jobId: string): Promise<JobResult | undefined>;
    
    /**
     * Close the queue connections
     * 
     * @returns Promise resolving when connections are closed
     */
    close(): Promise<void>;
}