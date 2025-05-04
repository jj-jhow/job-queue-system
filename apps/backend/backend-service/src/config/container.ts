import { QueueService } from '../services/queue/queue.interface';
import { bullMQService } from '../services/queue/bullmq.service';

// Simple dependency injection container
export const container = {
    queueService: bullMQService as QueueService
};