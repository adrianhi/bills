import { createApp } from './app';
import { config, validateRuntimeConfig } from './config';
import { connectDB, disconnectDB } from './config/database';
import { IngestionWorker } from './ingestion/ingestion-worker';
import { IngestionJobService } from './services/ingestion-job.service';
import { logger } from './shared/observability/logger';

async function bootstrap() {
  validateRuntimeConfig();
  await connectDB();
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('http_server_started', { port: config.port, apiBase: '/api/v1' });
  });

  const worker = new IngestionWorker();
  let workerRunning = true;
  let nextScheduleAt = 0;
  let nextPurgeAt = 0;

  const runWorkerLoop = async () => {
    while (workerRunning) {
      try {
        const now = Date.now();
        if (now >= nextScheduleAt) {
          await IngestionJobService.scheduleDue();
          nextScheduleAt = now + 60_000;
        }
        const processedGmail = await IngestionJobService.processNext();
        const processedResend = await worker.processNext();
        if (!processedGmail && !processedResend) {
          await new Promise((resolve) => setTimeout(resolve, 3_000));
        }
        if (now >= nextPurgeAt) {
          await worker.purgeExpiredRawContent();
          nextPurgeAt = now + 60 * 60_000;
        }
      } catch (err) {
        logger.error('embedded_worker_cycle_failed', { errorName: err instanceof Error ? err.name : 'UnknownError' });
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
    }
  };

  void runWorkerLoop();

  const shutdown = async () => {
    logger.info('http_server_stopping');
    workerRunning = false;
    server.close(async () => {
      await disconnectDB();
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
