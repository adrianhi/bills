import { connectDB, disconnectDB } from './config/database';
import { validateRuntimeConfig } from './config';
import { appContainer } from './app-container';
import { logger } from './shared/observability/logger';

async function run() {
  validateRuntimeConfig();
  await connectDB();
  appContainer.ingestionRunner.start();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await appContainer.ingestionRunner.stop();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

run().catch((error) => {
  logger.error('ingestion_worker_bootstrap_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
  process.exit(1);
});
