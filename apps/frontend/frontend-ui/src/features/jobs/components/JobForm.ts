import { ASSET_JOB_TYPES } from '../../../constants/constants';
import { jobApiService } from '../services/job-api.service';

export class AssetJobForm {
    private jobTypeSelect: HTMLSelectElement;
    private parametersContainer: HTMLElement;
    private submitButton: HTMLButtonElement;
    private errorElement: HTMLElement;
    private successElement: HTMLElement;
    
    constructor() {
        this.jobTypeSelect = document.getElementById('jobType') as HTMLSelectElement;
        this.parametersContainer = document.getElementById('jobParameters') as HTMLElement;
        this.submitButton = document.getElementById('submitJobBtn') as HTMLButtonElement;
        this.errorElement = document.getElementById('submitError') as HTMLElement;
        this.successElement = document.getElementById('submitSuccess') as HTMLElement;
        
        if (!this.jobTypeSelect || !this.parametersContainer || !this.submitButton || 
            !this.errorElement || !this.successElement) {
            console.error("Required form elements not found");
            return;
        }
        
        // Set up event listeners
        this.jobTypeSelect.addEventListener('change', () => this.updateParameterFields());
        this.submitButton.addEventListener('click', () => this.handleSubmit());
    }
    
    private updateParameterFields(): void {
        const jobType = this.jobTypeSelect.value;
        this.parametersContainer.innerHTML = '';
        
        if (!jobType) return;
        
        switch (jobType) {
            case ASSET_JOB_TYPES.PIPELINE:
                this.createPipelineForm();
                break;
            case ASSET_JOB_TYPES.EXPORT:
                this.createExportForm();
                break;
            case ASSET_JOB_TYPES.IMPORT:
                this.createImportForm();
                break;
            case ASSET_JOB_TYPES.DECIMATE:
                this.createDecimateForm();
                break;
            case ASSET_JOB_TYPES.TAG:
                this.createTagForm();
                break;
        }
    }
    
    private createExportForm(): void {
        const fields = [
            { id: 'input', label: 'Input File Path', type: 'text', required: true, placeholder: 'models/source.blend' },
            { id: 'output', label: 'Output File Path', type: 'text', required: true, placeholder: 'exports/output.fbx' },
            { 
                id: 'format', 
                label: 'Format', 
                type: 'select', 
                options: [
                    { value: 'fbx', label: 'FBX' },
                    { value: 'obj', label: 'OBJ' },
                    { value: 'gltf', label: 'glTF' },
                    { value: 'usd', label: 'USD' }
                ]
            },
            { id: 'quality', label: 'Quality (1-100)', type: 'number', min: 1, max: 100, value: 75 }
        ];
        
        this.renderFields(fields);
    }
    
    private createImportForm(): void {
        const fields = [
            { id: 'source', label: 'Source File Path', type: 'text', required: true, placeholder: 'downloads/model.fbx' },
            { id: 'destination', label: 'Destination Directory', type: 'text', required: true, placeholder: 'project/assets/' },
            { id: 'scale', label: 'Scale Factor', type: 'number', step: 0.1, value: 1.0 },
            { id: 'fix_orientation', label: 'Fix Orientation', type: 'checkbox' }
        ];
        
        this.renderFields(fields);
    }
    
    private createDecimateForm(): void {
        const fields = [
            { id: 'input', label: 'Input Model Path', type: 'text', required: true, placeholder: 'models/high_poly.obj' },
            { id: 'output', label: 'Output Model Path', type: 'text', required: true, placeholder: 'models/low_poly.obj' },
            { id: 'reduction', label: 'Reduction Percentage', type: 'number', min: 1, max: 99, value: 50 },
            { id: 'preserve_uvs', label: 'Preserve UVs', type: 'checkbox', checked: true }
        ];
        
        this.renderFields(fields);
    }
    
    private createTagForm(): void {
        const fields = [
            { id: 'target', label: 'Target Path', type: 'text', required: true, placeholder: 'models/assets' },
            { id: 'tags', label: 'Tags (space separated)', type: 'text', required: true, placeholder: 'environment outdoor medieval' },
            { id: 'category', label: 'Tag Category', type: 'text', value: 'general' },
            { id: 'replace', label: 'Replace Existing Tags', type: 'checkbox' }
        ];
        
        this.renderFields(fields);
    }
    
    private createPipelineForm(): void {
        const fields = [
            // Import step
            { id: 'header-import', label: '1. IMPORT SETTINGS', type: 'header' },
            { id: 'source', label: 'Source File Path', type: 'text', required: true, placeholder: 'external/downloaded_asset.fbx' },
            { id: 'destination', label: 'Destination Directory', type: 'text', required: true, placeholder: 'project/assets/props' },
            { id: 'scale', label: 'Scale Factor', type: 'number', step: 0.1, value: 1.0 },
            { id: 'fix_orientation', label: 'Fix Orientation', type: 'checkbox' },
            
            // Tag step
            { id: 'header-tag', label: '2. TAG SETTINGS', type: 'header' },
            { id: 'tags', label: 'Tags (space separated)', type: 'text', required: true, placeholder: 'prop furniture medieval' },
            { id: 'category', label: 'Tag Category', type: 'text', value: 'asset_type', required: false },
            
            // Decimate step
            { id: 'header-decimate', label: '3. DECIMATE SETTINGS', type: 'header' },
            { id: 'reduction', label: 'Reduction Percentage', type: 'number', min: 1, max: 99, value: 50 },
            { id: 'preserve_uvs', label: 'Preserve UVs', type: 'checkbox', checked: true },
            
            // Export step
            { id: 'header-export', label: '4. EXPORT SETTINGS', type: 'header' },
            { id: 'format', label: 'Export Format', type: 'select', options: [
                { value: 'fbx', label: 'FBX' },
                { value: 'obj', label: 'OBJ' },
                { value: 'gltf', label: 'glTF' },
                { value: 'usd', label: 'USD' }
            ]},
            { id: 'quality', label: 'Export Quality (1-100)', type: 'number', min: 1, max: 100, value: 75 }
        ];
        
        this.renderFields(fields);
    }
    
    private renderFields(fields: any[]): void {
        fields.forEach(field => {
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'mb-3';
            
            if (field.type === 'header') {
                const header = document.createElement('h3');
                header.className = 'font-semibold text-gray-700 mt-4 mb-2 border-b pb-1';
                header.textContent = field.label;
                fieldContainer.appendChild(header);
                this.parametersContainer.appendChild(fieldContainer);
                return;
            }
            
            const label = document.createElement('label');
            label.htmlFor = field.id;
            label.textContent = field.label;
            label.className = 'block text-sm font-medium text-gray-700 mb-1';
            
            let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            
            if (field.type === 'select') {
                input = document.createElement('select');
                field.options.forEach((option: any) => {
                    const optElement = document.createElement('option');
                    optElement.value = option.value;
                    optElement.textContent = option.label;
                    input.appendChild(optElement);
                });
            } else if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.rows = field.rows || 3;
            } else {
                input = document.createElement('input');
                input.type = field.type;
                
                if (field.type === 'number') {
                    if (field.min !== undefined) input.min = String(field.min);
                    if (field.max !== undefined) input.max = String(field.max);
                    if (field.step !== undefined) input.step = String(field.step);
                }
                
                if (field.type === 'checkbox' && field.checked) {
                    input.checked = true;
                }
            }
            
            input.id = field.id;
            input.name = field.id;
            
            if (field.type !== 'checkbox') {
                input.className = 'w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500';
            } else {
                input.className = 'mr-2';
                label.className = 'flex items-center text-sm font-medium text-gray-700';
                label.prepend(input);
                fieldContainer.appendChild(label);
                this.parametersContainer.appendChild(fieldContainer);
                return;
            }
            
            if (field.value !== undefined && field.type !== 'checkbox') {
                input.value = field.value;
            }
            
            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            
            if (field.required) {
                input.required = true;
            }
            
            fieldContainer.appendChild(label);
            if (field.type !== 'checkbox') {
                fieldContainer.appendChild(input);
            }
            this.parametersContainer.appendChild(fieldContainer);
        });
    }
    
    private async handleSubmit(): Promise<void> {
        this.errorElement.textContent = '';
        this.successElement.textContent = '';
        
        const jobType = this.jobTypeSelect.value;
        
        if (!jobType) {
            this.errorElement.textContent = 'Please select a job type';
            return;
        }
        
        try {
            this.submitButton.disabled = true;
            this.submitButton.textContent = 'Submitting...';
            
            const scriptParams = this.collectParameters(jobType);
            if (!scriptParams) return;
            
            const result = await jobApiService.submitJob({
                name: jobType,
                payload: { scriptParams }
            });
            
            this.successElement.textContent = `Job submitted successfully! Job ID: ${result.jobId}`;
            this.jobTypeSelect.value = '';
            this.parametersContainer.innerHTML = '';
            
        } catch (error) {
            console.error('Error submitting job:', error);
            this.errorElement.textContent = error instanceof Error 
                ? `Error submitting job: ${error.message}`
                : 'Unknown error submitting job';
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Submit Job';
        }
    }
    
    private collectParameters(jobType: string): any {
        switch (jobType) {
            case 'asset-pipeline':
                return this.collectPipelineParams();
            case 'asset-export':
                return this.collectExportParams();
            case 'asset-import':
                return this.collectImportParams();
            case 'asset-decimate':
                return this.collectDecimateParams();
            case 'asset-tag':
                return this.collectTagParams();
            default:
                this.errorElement.textContent = `Unknown job type: ${jobType}`;
                return null;
        }
    }
    
    private collectExportParams(): any {
        const input = (document.getElementById('input') as HTMLInputElement)?.value;
        const output = (document.getElementById('output') as HTMLInputElement)?.value;
        
        if (!input || !output) {
            this.errorElement.textContent = 'Input and output file paths are required';
            return null;
        }
        
        return {
            input,
            output,
            format: (document.getElementById('format') as HTMLSelectElement)?.value,
            quality: parseInt((document.getElementById('quality') as HTMLInputElement)?.value || '75')
        };
    }
    
    private collectImportParams(): any {
        const source = (document.getElementById('source') as HTMLInputElement)?.value;
        const destination = (document.getElementById('destination') as HTMLInputElement)?.value;
        
        if (!source || !destination) {
            this.errorElement.textContent = 'Source file and destination directory are required';
            return null;
        }
        
        return {
            source,
            destination,
            scale: parseFloat((document.getElementById('scale') as HTMLInputElement)?.value || '1.0'),
            fix_orientation: (document.getElementById('fix_orientation') as HTMLInputElement)?.checked
        };
    }
    
    private collectDecimateParams(): any {
        const input = (document.getElementById('input') as HTMLInputElement)?.value;
        const output = (document.getElementById('output') as HTMLInputElement)?.value;
        
        if (!input || !output) {
            this.errorElement.textContent = 'Input and output model paths are required';
            return null;
        }
        
        return {
            input,
            output,
            reduction: parseInt((document.getElementById('reduction') as HTMLInputElement)?.value || '50'),
            preserve_uvs: (document.getElementById('preserve_uvs') as HTMLInputElement)?.checked
        };
    }
    
    private collectTagParams(): any {
        const target = (document.getElementById('target') as HTMLInputElement)?.value;
        const tagsInput = (document.getElementById('tags') as HTMLInputElement)?.value;
        
        if (!target || !tagsInput) {
            this.errorElement.textContent = 'Target path and tags are required';
            return null;
        }
        
        return {
            target,
            tags: tagsInput.split(/\s+/).filter(tag => tag.trim() !== ''),
            category: (document.getElementById('category') as HTMLInputElement)?.value || 'general',
            replace: (document.getElementById('replace') as HTMLInputElement)?.checked
        };
    }

    private collectPipelineParams(): any {
        // Get the base model information
        const source = (document.getElementById('source') as HTMLInputElement)?.value;
        const destination = (document.getElementById('destination') as HTMLInputElement)?.value;
        
        if (!source || !destination) {
            this.errorElement.textContent = 'Source file and destination directory are required';
            return null;
        }
        
        // Derive filenames for the pipeline
        const fileName = source.split('/').pop() || '';
        const baseName = fileName.split('.')[0];
        const importedPath = `${destination}/${fileName}`;
        const decimatedPath = `${destination}/${baseName}_decimated.${fileName.split('.').pop()}`;
        const exportFormat = (document.getElementById('format') as HTMLSelectElement)?.value || 'fbx';
        const finalPath = `${destination}/${baseName}_final.${exportFormat}`;

        return {
            // Pipeline parameters
            pipeline: true,
            
            // Import parameters
            import: {
                source: source,
                destination: destination,
                scale: parseFloat((document.getElementById('scale') as HTMLInputElement)?.value || '1.0'),
                fix_orientation: (document.getElementById('fix_orientation') as HTMLInputElement)?.checked
            },
            
            // Tag parameters
            tag: {
                target: importedPath,
                tags: (document.getElementById('tags') as HTMLInputElement)?.value?.split(/\s+/).filter(t => t) || [],
                category: (document.getElementById('category') as HTMLInputElement)?.value || 'asset_type',
                replace: false
            },
            
            // Decimate parameters
            decimate: {
                input: importedPath,
                output: decimatedPath,
                reduction: parseInt((document.getElementById('reduction') as HTMLInputElement)?.value || '50'),
                preserve_uvs: (document.getElementById('preserve_uvs') as HTMLInputElement)?.checked
            },
            
            // Export parameters
            export: {
                input: decimatedPath,
                output: finalPath,
                format: exportFormat,
                quality: parseInt((document.getElementById('quality') as HTMLInputElement)?.value || '75')
            }
        };
    }
}