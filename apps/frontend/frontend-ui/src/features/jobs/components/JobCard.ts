import { JOB_STATUS_CLASSES } from '../../../constants/constants';
import { JobData } from '../types/job.types';

export class JobCardComponent {
    private container: HTMLElement;
    
    constructor(containerId: string) {
        const foundElement = document.getElementById(containerId);
        if (!foundElement) {
            throw new Error(`Element with ID "${containerId}" not found`);
        }
        this.container = foundElement;
    }
    
    updateJobDisplay(jobData: JobData): void {
        // Remove placeholder text if present
        const placeholder = this.container.querySelector('p.text-gray-500');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Find existing job card or create new one
        let jobCard = document.getElementById(`job-${jobData.id}`);
        if (!jobCard) {
            jobCard = document.createElement('div');
            jobCard.id = `job-${jobData.id}`;
            jobCard.className = 'job-status-card';
            this.container.insertBefore(jobCard, this.container.firstChild);
        }
        
        // Calculate status class
        let statusClass = JOB_STATUS_CLASSES.UNKNOWN;
        switch (jobData.status) {
            case 'waiting': statusClass = JOB_STATUS_CLASSES.WAITING; break;
            case 'active': statusClass = JOB_STATUS_CLASSES.ACTIVE; break;
            case 'processing': statusClass = JOB_STATUS_CLASSES.PROCESSING; break;
            case 'completed': statusClass = JOB_STATUS_CLASSES.COMPLETED; break;
            case 'failed': statusClass = JOB_STATUS_CLASSES.FAILED; break;
            case 'delayed': statusClass = JOB_STATUS_CLASSES.DELAYED; break;
            case 'paused': statusClass = JOB_STATUS_CLASSES.PAUSED; break;
            case 'not_found': statusClass = JOB_STATUS_CLASSES.NOT_FOUND; break;
        }
        
        // Calculate progress value
        const progressValue = (typeof jobData.progress === 'object' && jobData.progress !== null && 'percentage' in jobData.progress)
            ? jobData.progress.percentage
            : (typeof jobData.progress === 'number' ? jobData.progress : 0);
        
        // Update card HTML
        jobCard.innerHTML = `
            <h3>
                Job: ${jobData.name || 'N/A'} (${jobData.id})
                <span class="job-status-badge ${statusClass}">${jobData.status || 'unknown'}</span>
            </h3>
            ${jobData.status === 'active' || jobData.status === 'completed' ? `
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressValue}%">
                        ${progressValue}%
                    </div>
                </div>
            ` : ''}
            ${jobData.error ? `<p class="text-red-600 text-sm mb-2"><strong>Error:</strong> ${jobData.error}</p>` : ''}
            ${jobData.result ? `<p class="text-green-700 text-sm mb-2"><strong>Result:</strong> ${JSON.stringify(jobData.result)}</p>` : ''}
            <div class="text-sm font-semibold mb-1">Logs:</div>
            <div class="logs-container max-h-40 overflow-y-auto border border-gray-200 p-2 rounded bg-white">
                ${(jobData.logs || []).map(log => `<div class="log-entry ${log.includes('failed') || log.includes('Error') ? 'error' : (log.includes('completed successfully') ? 'success' : '')}">${log}</div>`).join('')}
            </div>
        `;
        
        // Auto-scroll logs to bottom
        const logsContainer = jobCard.querySelector('.logs-container');
        if (logsContainer) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
    }
}