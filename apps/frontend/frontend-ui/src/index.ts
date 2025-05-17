import { APP_CONFIG } from './config/config';
import { AssetJobForm } from './features/jobs/components/JobForm';
import { JobListComponent } from './features/jobs/components/JobList';
import { WebSocketStatusComponent } from './shared/components/WebSocketStatus';
import { websocketService } from './shared/services/websocket.service';

// Initialize WebSocket status component
const wsStatusComponent = new WebSocketStatusComponent('ws-status');
websocketService.on('connectionStatus', (statusData) => {
    wsStatusComponent.updateStatus(statusData);
});

// Initialize asset job form component
const assetJobForm = new AssetJobForm();

// Initialize job list component
const jobList = new JobListComponent('jobStatusContainer');

// Connect to WebSocket server
websocketService.connect();

console.log(`${APP_CONFIG.name} v${APP_CONFIG.version} initialized`);