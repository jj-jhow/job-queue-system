import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT || '3200'),
    host: process.env.HOST || 'localhost', // Listen on all addresses
    open: false // Don't try to open a browser
  },
  build: {
    outDir: 'dist',
  }
});