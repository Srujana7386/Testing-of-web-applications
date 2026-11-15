import { createApp } from './app.js';
import config from '../configuration/config.js';

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`[Research Server] Express application running at http://${config.host}:${config.port}`);
  console.log(`[Research Server] Environment: ${config.env}`);
  console.log(`[Research Server] Health endpoint: http://${config.host}:${config.port}/api/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Research Server] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Research Server] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Research Server] SIGINT received. Closing HTTP server...');
  server.close(() => {
    console.log('[Research Server] HTTP server closed.');
    process.exit(0);
  });
});
