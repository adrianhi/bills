import { createApp } from './app';
import { config, validateRuntimeConfig } from './config';
import { connectDB, disconnectDB } from './config/database';
import { appContainer } from './app-container';
import { logger } from './shared/observability/logger';

async function bootstrap() {
  validateRuntimeConfig();
  await connectDB();
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info('http_server_started', { port: config.port, apiBase: '/api/v1', processRole: config.processRole });
  });

  if (config.processRole === 'all' || config.processRole === 'worker') appContainer.ingestionRunner.start();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('http_server_stopping');
    await appContainer.ingestionRunner.stop();
    server.close(async () => {
      await disconnectDB();
      logger.info('http_server_stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error('http_server_bootstrap_failed', { errorName: err instanceof Error ? err.name : 'UnknownError' });
    process.exit(1);
  });
}
