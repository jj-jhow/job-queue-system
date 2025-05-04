import http from 'http';
import { bullMQService } from '../services/queue/bullmq.service';

export class GracefulShutdown {
    private server: http.Server;
    
    constructor(server: http.Server) {
        this.server = server;
        this.setupShutdownHandlers();
    }
    
    private setupShutdownHandlers(): void {
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }
    
    private shutdown(): void {
        console.log('Initiating graceful shutdown...');
        
        this.server.close(async () => {
            console.log('HTTP server closed.');
            
            try {
                await bullMQService.close();
                console.log('BullMQ connections closed.');
            } catch (err) {
                console.error('Error closing BullMQ:', err);
            } finally {
                console.log('Shutdown complete.');
                process.exit(0);
            }
        });
        
        // Force exit if graceful shutdown takes too long
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
}

export function setupGracefulShutdown(server: http.Server): GracefulShutdown {
    return new GracefulShutdown(server);
}