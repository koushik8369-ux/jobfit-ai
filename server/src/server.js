import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { validateJwtConfiguration } from './utils/jwt.js';
import mongoose from 'mongoose';
import { createCareerAiProvider } from './services/careerAiProvider.js';
import { createGracefulShutdown } from './utils/gracefulShutdown.js';

const shutdownTimeoutMs = 10_000;

function writeLog(level, event, details = {}) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  }));
}

try {
  const port = Number.parseInt(process.env.PORT || '5000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  validateJwtConfiguration();
  createCareerAiProvider();
  const app = createApp();
  await connectDatabase();
  const server = app.listen(port, '0.0.0.0', () => {
    writeLog('info', 'server_listening', { port });
  });
  const shutdown = createGracefulShutdown({
    server,
    disconnect: () => mongoose.disconnect(),
    timeoutMs: shutdownTimeoutMs,
  });

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  writeLog('error', 'server_startup_failed', {
    errorName: typeof error?.name === 'string' ? error.name : 'Error',
    message: typeof error?.message === 'string' ? error.message : 'Startup failed.',
  });
  process.exitCode = 1;
}