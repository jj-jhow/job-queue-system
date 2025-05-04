import { JobSubmission } from '../types/job.types';
import { jobApiService } from '../services/job-api.service';

export class JobFormComponent {
    private nameInput: HTMLInputElement;
    private payloadInput: HTMLTextAreaElement;
    private submitButton: HTMLButtonElement;
    private errorElement: HTMLElement;
    private successElement: HTMLElement;
    
    constructor(
        nameInputId: string,
        payloadInputId: string,
        submitButtonId: string,
        errorElementId: string,
        successElementId: string
    ) {
        this.nameInput = document.getElementById(nameInputId) as HTMLInputElement;
        this.payloadInput = document.getElementById(payloadInputId) as HTMLTextAreaElement;
        this.submitButton = document.getElementById(submitButtonId) as HTMLButtonElement;
        this.errorElement = document.getElementById(errorElementId) as HTMLElement;
        this.successElement = document.getElementById(successElementId) as HTMLElement;
        
        if (!this.nameInput || !this.payloadInput || !this.submitButton || !this.errorElement || !this.successElement) {
            throw new Error('One or more required elements not found');
        }
        
        this.submitButton.addEventListener('click', this.handleSubmit.bind(this));
    }
    
    private async handleSubmit(): Promise<void> {
        const payloadString = this.payloadInput.value.trim();
        const jobName = this.nameInput.value.trim();
        this.errorElement.textContent = '';
        this.successElement.textContent = '';
        
        if (!payloadString) {
            this.errorElement.textContent = 'Job payload cannot be empty.';
            return;
        }
        
        if (!jobName) {
            this.errorElement.textContent = 'Job name cannot be empty.';
            return;
        }
        
        let payload;
        try {
            payload = JSON.parse(payloadString);
        } catch (error) {
            if (error instanceof Error) {
                this.errorElement.textContent = 'Invalid JSON payload: ' + error.message;
            }
            return;
        }
        
        this.setSubmitButtonState(true);
        
        try {
            const jobData: JobSubmission = {
                name: jobName,
                payload
            };
            
            const result = await jobApiService.submitJob(jobData);
            
            this.successElement.textContent = `Job submitted successfully! Job ID: ${result.jobId}`;
            this.payloadInput.value = '';
            
        } catch (error) {
            console.error('Error submitting job:', error);
            if (error instanceof Error) {
                this.errorElement.textContent = 'Failed to submit job: ' + error.message;
            }
        } finally {
            this.setSubmitButtonState(false);
        }
    }
    
    private setSubmitButtonState(isSubmitting: boolean): void {
        if (isSubmitting) {
            this.submitButton.disabled = true;
            this.submitButton.textContent = 'Submitting...';
        } else {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Job';
        }
    }
}