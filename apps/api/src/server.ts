import { createApp } from './app';
import { config, validateRuntimeConfig } from './config';
import { connectDB } from './config/database';
import { logger } from './shared/observability/logger';

async function bootstrap() {
  validateRuntimeConfig();
  await connectDB();
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('http_server_started', { port: config.port, apiBase: '/api/v1' });
  });

  const shutdown = async () => {
    logger.info('http_server_stopping');
    server.close(() => {
      logger.info('http_server_stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error('http_server_bootstrap_failed', { errorName: err instanceof Error ? err.name : 'UnknownError' });
    process.exit(1);
  });
}
