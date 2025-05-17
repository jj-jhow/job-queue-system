import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const port = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173;
  const host = process.env.VITE_HOST || 'localhost';

  return {
    server: {
      port: port,
      host: host,
      open: false,
    },
    build: {
      outDir: 'dist',
    },
  };
});