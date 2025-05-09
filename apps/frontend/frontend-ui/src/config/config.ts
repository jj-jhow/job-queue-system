// Environment variables with fallbacks
const getEnvVariable = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return defaultValue;
};

// Server configuration
export const PORT = parseInt(getEnvVariable('PORT', '80'));
export const HOST = getEnvVariable('HOST', 'localhost');
export const NODE_ENV = getEnvVariable('NODE_ENV', 'development');

// API configuration
export const API_URL = getEnvVariable('API_URL', 'http://localhost:3000');
export const WEBSOCKET_URL = getEnvVariable('WEBSOCKET_URL', 'http://localhost:3000');

// Application settings
export const APP_CONFIG = {
  name: 'Asset Pipeline Job System',
  version: '1.0.0',
  maxLogEntries: 100
};