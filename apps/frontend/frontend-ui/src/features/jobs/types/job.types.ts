export interface JobProgress {
    percentage: number;
    log?: string;
}

export interface JobData {
    id: string;
    name: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown' | 'not_found' | 'processing';
    progress: number | JobProgress;
    logs: string[];
    result?: any;
    error?: string;
    timestamp?: number;
}

export interface JobSubmission {
    name: string;
    payload: any;
}

// New interfaces for asset pipeline
export interface AssetExportParams {
    input: string;
    output: string;
    format?: 'fbx' | 'obj' | 'gltf' | 'usd';
    quality?: number;
}

export interface AssetImportParams {
    source: string;
    destination: string;
    scale?: number;
    fix_orientation?: boolean;
}

export interface AssetDecimateParams {
    input: string;
    output: string;
    reduction?: number;
    preserve_uvs?: boolean;
}

export interface AssetTagParams {
    target: string;
    tags: string[];
    category?: string;
    replace?: boolean;
}

export interface JobSubmitResponse {
    message: string;
    jobId: string;
}