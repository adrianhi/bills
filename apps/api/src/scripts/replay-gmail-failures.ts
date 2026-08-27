import { prisma } from '../config/database';
import { IngestionJobService } from '../services/ingestion-job.service';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const connectionId = argument('connection');
  const bank = argument('bank')?.toUpperCase();
  const parserVersion = argument('parser-version');
  const errors = argument('errors')?.split(',').map((value) => value.trim()).filter(Boolean);
  const statuses = (argument('statuses') || 'FAILED').split(',').map((value) => value.trim().toUpperCase());
  if (statuses.some((status) => !['FAILED', 'IGNORED'].includes(status))) {
    throw new Error('--statuses only accepts FAILED and IGNORED.');
  }
  if (statuses.includes('IGNORED') && (!parserVersion || !errors?.length)) {
    throw new Error('Replaying IGNORED events requires both --parser-version and --errors.');
  }
  const provider = argument('provider') || 'GOOGLE_GMAIL';
  if (provider !== 'GOOGLE_GMAIL') {
    throw new Error('Only provider GOOGLE_GMAIL is supported by this replay command.');
  }

  const groups = await prisma.ingestionEvent.groupBy({
    by: ['workspaceId', 'inboxConnectionId', 'parserCode', 'parserVersion', 'errorCode'],
    where: {
      provider: 'GOOGLE_GMAIL',
      status: { in: statuses as Array<'FAILED' | 'IGNORED'> },
      inboxConnectionId: { not: null },
      ...(connectionId ? { inboxConnectionId: connectionId } : {}),
      ...(bank ? { parserCode: bank } : {}),
      ...(parserVersion ? { parserVersion } : {}),
      ...(errors?.length ? { errorCode: { in: errors } } : {}),
    },
    _count: { _all: true },
  });

  const total = groups.reduce((sum, group) => sum + group._count._all, 0);
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', provider, total, groups }, null, 2));
  if (!apply || total === 0) return;

  const connections = new Map<string, string>();
  for (const group of groups) {
    if (group.inboxConnectionId) connections.set(group.inboxConnectionId, group.workspaceId);
  }
  const jobs = [];
  for (const [id, workspaceId] of connections) {
    jobs.push(await IngestionJobService.enqueueReplay(workspaceId, id, {
      bank,
      errors,
      parserVersion,
      statuses: statuses as Array<'FAILED' | 'IGNORED'>,
    }));
  }
  console.log(JSON.stringify({ queued: jobs.map((job) => ({ id: job.id, connectionId: job.inboxConnectionId })) }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
