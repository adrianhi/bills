import { connectDB, disconnectDB } from './config/database';
import { validateRuntimeConfig } from './config';
import { IngestionWorker } from './ingestion/ingestion-worker';
import { IngestionJobService } from './services/ingestion-job.service';
import { logger } from './shared/observability/logger';

async function run() {
  validateRuntimeConfig();
  await connectDB();
  const worker = new IngestionWorker();
  let running = true;
  let nextScheduleAt = 0;
  let nextPurgeAt = 0;

  const shutdown = async () => {
    running = false;
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    const now = Date.now();
    if (now >= nextScheduleAt) {
      await IngestionJobService.scheduleDue();
      nextScheduleAt = now + 60_000;
    }
    const processedGmail = await IngestionJobService.processNext();
    const processedResend = await worker.processNext();
    if (!processedGmail && !processedResend) await new Promise((resolve) => setTimeout(resolve, 2_000));
    if (now >= nextPurgeAt) {
      await worker.purgeExpiredRawContent();
      nextPurgeAt = now + 60 * 60_000;
    }
  }
}

run().catch((error) => {
  logger.error('ingestion_worker_bootstrap_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
  process.exit(1);
});
