import { prisma } from '../config/database';
import { IngestionJobService } from '../services/ingestion-job.service';

function listArgument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0
    ? (process.argv[index + 1] || '').split(',').map((value) => value.trim()).filter(Boolean)
    : [];
}

async function run() {
  const ids = listArgument('ids');
  const interruptedEventIds = listArgument('interrupted-event-ids');
  const resume = process.argv.includes('--resume-interrupted');
  if (!ids.length) throw new Error('--ids is required; the general worker is intentionally not started by this command.');
  const known = await prisma.ingestionJob.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, status: true, inboxConnectionId: true },
  });
  if (known.length !== ids.length) throw new Error('One or more ingestion job IDs do not exist.');
  if (known.some((job) => job.type !== 'GMAIL_FAILED_REPLAY')) {
    throw new Error('This command only processes explicit GMAIL_FAILED_REPLAY jobs.');
  }

  if (resume) {
    if (!interruptedEventIds.length) {
      throw new Error('--interrupted-event-ids is required with --resume-interrupted.');
    }
    const connectionIds = [...new Set(known.map((job) => job.inboxConnectionId))];
    const interruptedEvents = await prisma.ingestionEvent.findMany({
      where: { id: { in: interruptedEventIds } },
      select: { id: true, inboxConnectionId: true, provider: true, status: true },
    });
    if (interruptedEvents.length !== interruptedEventIds.length) {
      throw new Error('One or more interrupted event IDs do not exist.');
    }
    if (interruptedEvents.some((event) =>
      event.provider !== 'GOOGLE_GMAIL' ||
      event.status !== 'PROCESSING' ||
      !event.inboxConnectionId ||
      !connectionIds.includes(event.inboxConnectionId)
    )) {
      throw new Error('Interrupted events must be PROCESSING Gmail events from the selected job connections.');
    }
    await prisma.$transaction([
      prisma.ingestionJob.updateMany({
        where: { id: { in: ids }, status: 'PROCESSING' },
        data: { leaseUntil: new Date(0) },
      }),
      prisma.ingestionEvent.updateMany({
        where: {
          id: { in: interruptedEventIds },
          provider: 'GOOGLE_GMAIL',
          status: 'PROCESSING',
        },
        data: {
          status: 'FAILED',
          errorCode: 'INTERRUPTED_REPLAY',
          errorMessage: 'INTERRUPTED_REPLAY',
        },
      }),
    ]);
  }

  while (await IngestionJobService.processNext(ids)) {
    // Only the explicitly supplied IDs can be claimed.
  }
  const results = await prisma.ingestionJob.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, attempts: true, errorCode: true, errorMessage: true, payload: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(JSON.stringify({ jobs: results }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
