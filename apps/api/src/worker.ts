import { connectDB, prisma } from './config/database';
import { config } from './config';
import { IngestionWorker } from './ingestion/ingestion-worker';

async function run() {
  if (!config.resendApiKey) throw new Error('RESEND_API_KEY is required to start the ingestion worker.');
  await connectDB();
  const worker = new IngestionWorker();
  let running = true;

  const shutdown = async () => {
    running = false;
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    const processed = await worker.processNext();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 2_000));
    if (Date.now() % 100 < 5) await worker.purgeExpiredRawContent();
  }
}

run().catch((error) => {
  console.error('Ingestion worker failed to start:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
