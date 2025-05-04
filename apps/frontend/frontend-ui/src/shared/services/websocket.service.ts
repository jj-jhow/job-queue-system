import { WEBSOCKET_URL } from '../../core/config/constants';
import { JobData } from '../../features/jobs/types/job.types';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionStatusData {
    status: ConnectionStatus;
    id?: string;
    error?: string;
    reason?: string;
}

export type WebSocketEventCallback = (data: any) => void;

export class WebSocketService {
    private socket: Socket | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private eventListeners: Map<string, WebSocketEventCallback[]> = new Map();
    
    constructor(private url: string = WEBSOCKET_URL) {}
    
    public connect(): void {
        this.setConnectionStatus('connecting');
        
        this.socket = io(this.url);
        
        this.socket.on('connect', () => {
            this.setConnectionStatus('connected', { id: this.socket?.id });
        });
        
        this.socket.on('connect_error', (err) => {
            this.setConnectionStatus('error', { error: err.message });
        });
        
        this.socket.on('disconnect', (reason) => {
            this.setConnectionStatus('disconnected', { reason });
        });
        
        this.socket.on('jobStatusUpdate', (jobUpdate: JobData) => {
            this.triggerEvent('jobStatusUpdate', jobUpdate);
        });
        
        this.socket.on('jobQueued', (jobQueuedData: JobData) => {
            this.triggerEvent('jobQueued', jobQueuedData);
        });
    }
    
    public disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
    }
    
    public on(event: string, callback: WebSocketEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        this.eventListeners.get(event)?.push(callback);
    }
    
    public off(event: string, callback: WebSocketEventCallback): void {
        if (!this.eventListeners.has(event)) return;
        
        const callbacks = this.eventListeners.get(event) || [];
        const index = callbacks.indexOf(callback);
        
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }
    
    public getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }
    
    private setConnectionStatus(status: ConnectionStatus, data: Partial<ConnectionStatusData> = {}): void {
        this.connectionStatus = status;
        this.triggerEvent('connectionStatus', {
            status,
            ...data
        });
    }
    
    private triggerEvent(event: string, data: any): void {
        const callbacks = this.eventListeners.get(event) || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} callback:`, error);
            }
        });
    }
}

// Create a singleton instance
export const websocketService = new WebSocketService();