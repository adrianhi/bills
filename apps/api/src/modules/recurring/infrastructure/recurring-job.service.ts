import { prisma } from '../../../config/database';
import type { RecurringJobProcessor } from '../application/recurring.ports';
import type { ProcessRecurringScan } from '../application/process-recurring-scan';

const DAY_MS = 86_400_000;

export class RecurringJobService implements RecurringJobProcessor {
  constructor(private readonly processScan: ProcessRecurringScan) {}

  async scheduleDue() {
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        recurringScanJob: true,
        transactions: { select: { updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    const dailyCutoff = new Date(Date.now() - DAY_MS);
    for (const workspace of workspaces) {
      const job = workspace.recurringScanJob;
      if (!job) {
        await prisma.recurringScanJob.create({ data: { workspaceId: workspace.id } });
        continue;
      }
      if (job.status === 'PENDING' || job.status === 'PROCESSING') continue;
      if (job.status === 'FAILED' && job.nextAttemptAt > new Date()) continue;
      const changedAt = workspace.transactions[0]?.updatedAt;
      if (!job.lastScannedAt || job.lastScannedAt < dailyCutoff || (changedAt && changedAt > job.lastScannedAt)) {
        await prisma.recurringScanJob.update({
          where: { id: job.id }, data: { status: 'PENDING', cursor: 0, attempts: 0, nextAttemptAt: new Date() },
        });
      }
    }
  }

  async processNext() {
    const now = new Date();
    const job = await prisma.recurringScanJob.findFirst({
      where: {
        nextAttemptAt: { lte: now },
        OR: [{ status: 'PENDING' }, { status: 'FAILED' }, { status: 'PROCESSING', leaseUntil: { lt: now } }],
      },
      orderBy: { nextAttemptAt: 'asc' },
    });
    if (!job) return false;
    const leaseUntil = new Date(Date.now() + 30_000);
    const claimed = await prisma.recurringScanJob.updateMany({
      where: { id: job.id, OR: [{ status: { not: 'PROCESSING' } }, { leaseUntil: { lt: now } }] },
      data: { status: 'PROCESSING', leaseUntil },
    });
    if (!claimed.count) return false;
    try {
      const result = await this.processScan.batch(job.workspaceId, job.cursor);
      await prisma.recurringScanJob.update({
        where: { id: job.id },
        data: result.complete
          ? { status: 'READY', cursor: 0, attempts: 0, leaseUntil: null, lastScannedAt: new Date(), errorCode: null }
          : { status: 'PENDING', cursor: result.nextCursor, leaseUntil: null, nextAttemptAt: new Date() },
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      await prisma.recurringScanJob.update({
        where: { id: job.id }, data: {
          status: 'FAILED', attempts, leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + Math.min(60_000, 2 ** attempts * 1_000)),
          errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        },
      });
    }
    return true;
  }
}
