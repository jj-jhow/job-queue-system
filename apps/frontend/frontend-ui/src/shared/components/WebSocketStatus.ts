import { ConnectionStatusData } from '../services/websocket.service';

export class WebSocketStatusComponent {
    private element: HTMLElement;
    
    constructor(elementId: string) {
        const foundElement = document.getElementById(elementId);
        if (!foundElement) {
            throw new Error(`Element with ID "${elementId}" not found`);
        }
        this.element = foundElement;
    }
    
    updateStatus(statusData: ConnectionStatusData): void {
        const { status, error, reason, id } = statusData;
        
        switch (status) {
            case 'connecting':
                this.element.textContent = 'Connecting...';
                this.element.className = 'mb-4 text-center p-2 rounded-md bg-yellow-100 text-yellow-800';
                break;
            case 'connected':
                this.element.textContent = `Connected ${id ? `(${id})` : ''}`;
                this.element.className = 'mb-4 text-center p-2 rounded-md bg-green-100 text-green-800';
                break;
            case 'error':
                this.element.textContent = `Connection Error: ${error || 'Unknown error'}`;
                this.element.className = 'mb-4 text-center p-2 rounded-md bg-red-100 text-red-800';
                break;
            case 'disconnected':
                this.element.textContent = `Disconnected: ${reason || 'Unknown reason'}`;
                this.element.className = 'mb-4 text-center p-2 rounded-md bg-red-100 text-red-800';
                break;
        }
    }
}