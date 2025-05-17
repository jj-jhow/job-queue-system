// --- Configuration ---

// Helper to safely access Vite's environment variables with a fallback
const safeGetEnv = (key: string, defaultValue: string): string => {
  // Vite exposes env variables via import.meta.env
  // Ensure your .env variables are prefixed with VITE_ (e.g., VITE_API_URL)
  if (import.meta.env && typeof import.meta.env[key] !== 'undefined') {
    return import.meta.env[key] as string;
  }
  return defaultValue;
};

// Server configuration
// In your .env file, use VITE_PORT, VITE_HOST, VITE_NODE_ENV
export const PORT = parseInt(safeGetEnv('VITE_PORT', '80'));
export const HOST = safeGetEnv('VITE_HOST', 'localhost');
export const NODE_ENV = safeGetEnv('VITE_NODE_ENV', 'development');

// API configuration
// In your .env file, use VITE_API_URL, VITE_WEBSOCKET_URL
export const API_URL = safeGetEnv('VITE_API_URL', 'http://localhost:3000');
export const WEBSOCKET_URL = safeGetEnv('VITE_WEBSOCKET_URL', 'http://localhost:3000');

// Application settings
export const APP_CONFIG = {
  name: 'Asset Pipeline Job System',
  version: '1.0.0',
  maxLogEntries: 100
};