import express from 'express';
import http from 'http';
import cors from 'cors';
import { PORT } from './config/config';
import { jobController } from './controllers/job.controller';
import { socketService } from './services/socket.service';
import { setupGracefulShutdown } from './utils/shutdown';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// API routes
app.use(jobController.router);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
socketService.initialize(server);

// Setup graceful shutdown
setupGracefulShutdown(server);

// Start server
server.listen(PORT, () => {
    console.log(`Backend service running on http://localhost:${PORT}`);
    console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});