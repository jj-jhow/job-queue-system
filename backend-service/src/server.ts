// backend-service/src/server.ts

import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Queue, QueueEvents, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors'; // Import the cors middleware

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const JOB_QUEUE_NAME = 'jobQueueBullMQ';

// --- Redis Connection Options for BullMQ ---
const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
};

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*", // CORS for Socket.IO (WebSocket connections)
        methods: ["GET", "POST"]
    }
});

// --- BullMQ Queue Initialization ---
const myQueue = new Queue(JOB_QUEUE_NAME, { connection });
const queueEvents = new QueueEvents(JOB_QUEUE_NAME, { connection });

queueEvents.on('error', (err) => {
    console.error('BullMQ QueueEvents Error:', err);
});

// --- Middleware ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());


// --- Data Structures ---
interface JobStatus {
    id: string;
    name: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown';
    progress: number | object;
    logs: string[];
    result?: any;
    error?: string;
    timestamp: number; // Job creation timestamp from BullMQ job
}
const jobStore: Map<string, JobStatus> = new Map();

// --- API Endpoints ---

/**
 * @route POST /jobs
 * @description Adds a new job to the BullMQ queue.
 * @body { name: string, payload: any } - Job name (type) and data
 */
app.post('/jobs', async (req: Request, res: Response) => {
    try {
        const { name, payload } = req.body;

        if (!name || !payload) {
            return res.status(400).json({ message: 'Missing job name or payload' });
        }

        const job = await myQueue.add(name, payload, {
            removeOnComplete: true,
            removeOnFail: 50
        });

        const jobId = job.id;
        if (!jobId) {
             console.error('Job added but ID is missing:', job);
             return res.status(500).json({ message: 'Failed to get job ID after adding to queue' });
        }

        console.log(`Job ${jobId} (${name}) added to queue.`);

        const initialStatus: JobStatus = {
            id: jobId,
            name: name,
            status: 'waiting',
            progress: 0,
            logs: [`[${new Date().toISOString()}] Job ${jobId} queued.`], // Use current time for queue log
            timestamp: job.timestamp, // Store BullMQ's creation timestamp
        };
        jobStore.set(jobId, initialStatus);

        io.emit('jobQueued', initialStatus);

        res.status(202).json({ message: 'Job accepted', jobId: jobId });

    } catch (error: any) {
        console.error('Error adding job:', error);
        res.status(500).json({ message: 'Failed to add job', error: error.message });
    }
});

/**
 * @route GET /jobs/:jobId
 * @description Gets the current status of a specific job from BullMQ and our store.
 * @param {string} jobId - The ID of the job
 */
app.get('/jobs/:jobId', async (req: Request, res: Response) => {
    const jobId = req.params.jobId;
    try {
        const job = await myQueue.getJob(jobId);
        const cachedStatus = jobStore.get(jobId);

        if (!job && !cachedStatus) {
            if (cachedStatus) {
                 res.status(200).json(cachedStatus);
                 return;
            }
            return res.status(404).json({ message: 'Job not found' });
        }

        let currentState: JobStatus['status'] = 'unknown';
        if (job) {
             currentState = await job.getState();
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

        res.status(200).json(combinedStatus);

    } catch (error: any) {
        console.error(`Error getting job ${jobId}:`, error);
        res.status(500).json({ message: 'Failed to get job status', error: error.message });
    }
});


// --- WebSocket Communication ---

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on('getJobStatus', async (jobId: string) => {
         try {
            const job = await myQueue.getJob(jobId);
            const cachedStatus = jobStore.get(jobId);
             if (!job && !cachedStatus) {
                 socket.emit('jobStatusUpdate', { id: jobId, status: 'not_found' });
                 return;
             }
             let currentState: JobStatus['status'] = 'unknown';
             if (job) { currentState = await job.getState(); }
             else if (cachedStatus) { currentState = cachedStatus.status; }

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
             socket.emit('jobStatusError', { jobId, message: 'Failed to retrieve job status', error: error.message });
         }
    });
});

// --- Listen to BullMQ Events and Broadcast via WebSocket ---

function updateAndBroadcast(jobId: string, updates: Partial<JobStatus>) {
     const currentStatus = jobStore.get(jobId) || {
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


    jobStore.set(jobId, newStatus);
    io.emit('jobStatusUpdate', newStatus);
    console.log(`[${jobId}] Broadcasted update:`, updates);
}

queueEvents.on('progress', ({ jobId, data }, timestamp) => {
    console.log(`Job ${jobId} progress:`, data);
    const currentStatus = jobStore.get(jobId);
    const progress = typeof data === 'number' ? data : (data as any)?.percentage ?? currentStatus?.progress ?? 0;
    // Use timestamp from event if valid, otherwise current time
    const eventTime = (timestamp && !isNaN(Number(timestamp))) ? new Date(Number(timestamp)) : new Date();
    const logMessage = (typeof data === 'object' && (data as any)?.log) ? (data as any).log : `Progress: ${progress}%`;

    updateAndBroadcast(jobId, {
        status: 'active',
        progress: progress,
        logs: [`[${eventTime.toISOString()}] ${logMessage}`]
    });
});

queueEvents.on('completed', ({ jobId, returnvalue }, timestamp) => {
    console.log(`Job ${jobId} completed successfully. Result:`, returnvalue);
    // Use timestamp from event if valid, otherwise current time
    const eventTime = (timestamp && !isNaN(Number(timestamp))) ? new Date(timestamp) : new Date();
    updateAndBroadcast(jobId, {
        status: 'completed',
        progress: 100,
        result: returnvalue,
        logs: [`[${eventTime.toISOString()}] Job completed successfully.`]
    });
});

queueEvents.on('failed', ({ jobId, failedReason }, timestamp) => {
    console.log(`Job ${jobId} failed:`, failedReason);
     // Use timestamp from event if valid, otherwise current time
    const eventTime = (timestamp && !isNaN(Number(timestamp))) ? new Date(timestamp) : new Date();
    updateAndBroadcast(jobId, {
        status: 'failed',
        error: failedReason,
        logs: [`[${eventTime.toISOString()}] Job failed: ${failedReason}`]
    });
});

// *** FIX: Use current time for 'active' event log ***
queueEvents.on('active', ({ jobId, prev }) => { // Removed timestamp parameter from handler signature
     console.log(`Job ${jobId} is now active (previous state: ${prev})`);
     const eventTime = new Date(); // Get current time when event is handled
     myQueue.getJob(jobId).then(job => {
         updateAndBroadcast(jobId, {
             status: 'active',
             name: job?.name, // Update name if available
             timestamp: job?.timestamp, // Ensure we store the original creation timestamp
             logs: [`[${eventTime.toISOString()}] Job started processing.`] // Use current time for log
         });
     }).catch(err => {
          console.error(`[${jobId}] Error fetching job details during 'active' event:`, err);
          // Still update status even if fetching details fails
          updateAndBroadcast(jobId, {
              status: 'active',
              logs: [`[${eventTime.toISOString()}] Job started processing (details fetch failed).`]
          });
     });
});


// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Backend service (BullMQ) running on http://localhost:${PORT}`);
    console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});

// Graceful shutdown
async function gracefulShutdown() {
    console.log('Initiating graceful shutdown...');
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await myQueue.close();
            console.log('BullMQ queue closed.');
            await queueEvents.close();
            console.log('BullMQ queue events closed.');
        } catch (err) {
            console.error('Error closing BullMQ:', err);
        } finally {
            console.log('Shutdown complete.');
            process.exit(0);
        }
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

