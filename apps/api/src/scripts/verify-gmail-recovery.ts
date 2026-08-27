import { prisma } from '../config/database';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function run() {
  const sinceValue = argument('since') || '2026-08-20T00:00:00.000Z';
  const since = new Date(sinceValue);
  if (Number.isNaN(since.getTime())) throw new Error('--since must be a valid ISO-8601 date.');

  const connections = await prisma.inboxConnection.findMany({
    where: { provider: 'GOOGLE' },
    select: { id: true, workspaceId: true, status: true, lastErrorCode: true, lastSyncSummary: true },
    orderBy: { createdAt: 'asc' },
  });

  const report = [];
  for (const connection of connections) {
    const [events, processingEvents, latestTransaction, sinceCount, reversedCount, replayJobs] = await Promise.all([
      prisma.ingestionEvent.groupBy({
        by: ['status', 'errorCode', 'parserVersion'],
        where: { inboxConnectionId: connection.id, provider: 'GOOGLE_GMAIL', parserCode: 'BHD' },
        _count: { _all: true },
      }),
      prisma.ingestionEvent.findMany({
        where: { inboxConnectionId: connection.id, provider: 'GOOGLE_GMAIL', status: 'PROCESSING' },
        select: { id: true },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.transaction.findFirst({
        where: { workspaceId: connection.workspaceId, institutionCode: 'BHD', ingestionChannel: 'GMAIL_OAUTH' },
        select: { transactionDate: true },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transaction.count({
        where: {
          workspaceId: connection.workspaceId,
          institutionCode: 'BHD',
          ingestionChannel: 'GMAIL_OAUTH',
          transactionDate: { gte: since },
        },
      }),
      prisma.transaction.count({
        where: {
          workspaceId: connection.workspaceId,
          institutionCode: 'BHD',
          ingestionChannel: 'GMAIL_OAUTH',
          statusCode: 'REVERSED',
        },
      }),
      prisma.ingestionJob.findMany({
        where: { inboxConnectionId: connection.id, type: 'GMAIL_FAILED_REPLAY' },
        select: { id: true, status: true, attempts: true, errorCode: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);
    report.push({
      connectionId: connection.id,
      connectionStatus: connection.status,
      lastErrorCode: connection.lastErrorCode,
      lastSyncSummary: connection.lastSyncSummary,
      gmailBhdEvents: events,
      processingEventIds: processingEvents.map((event) => event.id),
      latestTransactionAt: latestTransaction?.transactionDate.toISOString() || null,
      transactionsSince: { since: since.toISOString(), count: sinceCount },
      reversedTransactions: reversedCount,
      recentReplayJobs: replayJobs,
    });
  }

  console.log(JSON.stringify({ connections: report }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
