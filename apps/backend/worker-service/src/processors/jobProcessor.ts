// filepath: d:\repos\job-queue-system\apps\backend\worker-service\src\processors\jobProcessor.ts
// jobProcessor.ts

import { Job } from 'bullmq';
import { spawn } from 'child_process';
import path from 'path';

// Map job types to their corresponding Python scripts
const JOB_SCRIPT_MAP: Record<string, string> = {
  // 'asset-export': 'export.py',
  // 'asset-import': 'import.py',
  // 'asset-decimate': 'decimate.py',
  // 'asset-tag': 'tag.py',
  // 'asset-pipeline': 'pipeline.py'
};

export async function processJob(job: Job): Promise<any> {
  const { id, name: jobType, data: payload } = job;
  console.log(`--- [${id}] Starting Job of type ${jobType} ---`);
  
  await job.log(`Starting job processing for type: ${jobType}`);
  
  // If job type requires a Python script
  if (JOB_SCRIPT_MAP[jobType]) {
    return await executePythonScript(job, jobType, payload);
  }
  
  // Default processing for other job types
  return await defaultProcessing(job);
}

async function executePythonScript(job: Job, jobType: string, payload: any): Promise<any> {
  const { id } = job;
  const scriptName = JOB_SCRIPT_MAP[jobType];
  const scriptPath = path.resolve(`./apps/asset-pipeline/src/automation/${scriptName}`);
  
  console.log(`[${id}] Executing Python script: ${scriptPath}`);
  await job.log(`Executing Python script: ${scriptName}`);
  await job.updateProgress({ percentage: 5, log: `Starting ${scriptName}...` });
  
  return new Promise((resolve, reject) => {
    // Build command arguments from payload
    const args = buildScriptArguments(jobType, payload);
    
    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    let stdoutData = '';
    let stderrData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`[${id}] STDOUT: ${output.trim()}`);
      job.log(`STDOUT: ${output.trim()}`);
      
      // Parse progress information if available
      const progressMatch = output.match(/Progress:\s*(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progressPercent = Math.min(Math.round(parseFloat(progressMatch[1])), 100);
        job.updateProgress({ 
          percentage: progressPercent, 
          log: output.trim() 
        });
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.error(`[${id}] STDERR: ${output.trim()}`);
      job.log(`ERROR: ${output.trim()}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`[${id}] Process exited with code ${code}`);
      
      if (code === 0) {
        // Success
        job.updateProgress({ percentage: 100, log: 'Script execution completed successfully' });
        const result = {
          success: true,
          message: `${jobType} executed successfully`,
          scriptOutput: stdoutData.split('\n').filter(line => line.trim()),
          processedData: payload
        };
        resolve(result);
      } else {
        // Error
        const error = new Error(`Script execution failed with code ${code}: ${stderrData}`);
        reject(error);
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`[${id}] Failed to start Python process: ${error.message}`);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

function buildScriptArguments(jobType: string, payload: any): string[] {
  const { scriptParams = {} } = payload;
  const args: string[] = [];
  
  switch (jobType) {
    case 'asset-export':
      if (scriptParams.input) args.push(scriptParams.input);
      if (scriptParams.output) args.push(scriptParams.output);
      if (scriptParams.format) args.push('--format', scriptParams.format);
      if (scriptParams.quality) args.push('--quality', scriptParams.quality.toString());
      break;
      
    case 'asset-import':
      if (scriptParams.source) args.push(scriptParams.source);
      if (scriptParams.destination) args.push(scriptParams.destination);
      if (scriptParams.scale) args.push('--scale', scriptParams.scale.toString());
      if (scriptParams.fix_orientation) args.push('--fix-orientation');
      break;
      
    case 'asset-decimate':
      if (scriptParams.input) args.push(scriptParams.input);
      if (scriptParams.output) args.push(scriptParams.output);
      if (scriptParams.reduction) args.push('--reduction', scriptParams.reduction.toString());
      if (scriptParams.preserve_uvs) args.push('--preserve-uvs');
      break;
      
    case 'asset-tag':
      if (scriptParams.target) args.push(scriptParams.target);
      if (scriptParams.tags && Array.isArray(scriptParams.tags)) {
        args.push('--tags', ...scriptParams.tags);
      }
      if (scriptParams.category) args.push('--category', scriptParams.category);
      if (scriptParams.replace) args.push('--replace');
      break;
  }
  
  return args;
}

async function defaultProcessing(job: Job): Promise<any> {
  const { id, data: payload } = job;
  
  try {
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 5000)); 
      
      const logMessage = `Processing step ${progress / 20 + 1}...`;
      console.log(`[${id}] LOG: ${logMessage}`);
      await job.log(logMessage);
      
      await job.updateProgress({ percentage: progress, log: logMessage });
      console.log(`[${id}] Progress: ${progress}%`);
    }
    
    const result = { message: `Job ${id} completed successfully`, processedData: payload };
    await job.log(`Job finished successfully.`);
    console.log(`[${id}] Completed.`);
    
    return result;
  } catch (error: any) {
    console.error(`[${id}] Failed: ${error.message}`);
    await job.log(`Job failed: ${error.message}`);
    throw error;
  } finally {
    console.log(`--- [${id}] Finished Job ---`);
  }
}