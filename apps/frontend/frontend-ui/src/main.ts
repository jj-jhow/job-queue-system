import { JobFormComponent } from './features/jobs/components/JobForm';
import { JobListComponent } from './features/jobs/components/JobList';
import { WebSocketStatusComponent } from './shared/components/WebSocketStatus';
import { websocketService } from './shared/services/websocket.service';

// Initialize WebSocket status component
const wsStatusComponent = new WebSocketStatusComponent('ws-status');
websocketService.on('connectionStatus', (statusData) => {
    wsStatusComponent.updateStatus(statusData);
});

// Initialize job form component
const jobForm = new JobFormComponent(
    'jobName',
    'jobPayload',
    'submitJobBtn',
    'submitError',
    'submitSuccess'
);

// Initialize job list component
const jobList = new JobListComponent('jobStatusContainer');

// Connect to WebSocket server
websocketService.connect();

console.log('Job Queue System UI initialized');