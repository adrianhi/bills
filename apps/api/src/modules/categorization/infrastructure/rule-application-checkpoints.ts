import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { ClassificationChange, ClassificationWriter } from '../../transactions';
import type { ApplicationJob } from '../application/rule-application.port';
import type { PreviewDecision } from '../domain/preview-decision';

export type ClassificationWriterFactory = (tx: Prisma.TransactionClient) => ClassificationWriter;

async function fence(tx: Prisma.TransactionClient, job: ApplicationJob) {
  const lease = await tx.ruleApplication.updateMany({
    where: { id: job.id, leaseToken: job.leaseToken, status: 'PROCESSING', leaseUntil: { gt: new Date() } },
    data: { updatedAt: new Date() },
  });
  if (!lease.count) throw new Error('RULE_APPLICATION_LEASE_LOST');
}
export async function checkpointPreview(job: ApplicationJob, rows: PreviewDecision[], scanned: number, cursor: string | null, complete: boolean) {
  await prisma.$transaction(async (tx) => {
    await fence(tx, job);
    if (rows.length) await tx.ruleApplicationItem.createMany({ data: rows.map((row) => ({
      applicationId: job.id, transactionId: row.transactionId, version: row.version,
      before: row.before, after: row.after, reason: row.reason,
      status: row.reason === 'CHANGE' ? 'PENDING' : 'EXCLUDED',
    })) });
    const count = (fn: (row: PreviewDecision) => number) => rows.reduce((total, row) => total + fn(row), 0);
    await tx.ruleApplication.update({ where: { id: job.id }, data: {
      cursor, scanned: { increment: scanned }, matched: { increment: rows.length },
      changes: { increment: count((row) => Number(row.reason === 'CHANGE')) },
      categoryChanges: { increment: count((row) => Number(row.after.changeCategory)) },
      merchantChanges: { increment: count((row) => Number(row.after.changeMerchant)) },
      protectedManual: { increment: count((row) => row.protectedManual) },
      protectedUnknown: { increment: count((row) => row.protectedUnknown) },
      otherRule: { increment: count((row) => Number(row.reason === 'OTHER_RULE')) },
      status: complete ? 'READY' : 'QUEUED', leaseUntil: null, leaseToken: null, attempts: 0, errorCode: null,
    } });
  });
}

export async function applyClassificationBatch(job: ApplicationJob, writerFactory: ClassificationWriterFactory) {
  await prisma.$transaction(async (tx) => {
    await fence(tx, job);
    const items = await tx.ruleApplicationItem.findMany({
      where: { applicationId: job.id, status: 'PENDING' }, orderBy: { id: 'asc' }, take: 250,
    });
    const writer = writerFactory(tx);
    const changes = items.map((item) => ({ id: item.transactionId, version: item.version, change: item.after as unknown as ClassificationChange }));
    const appliedIds = writer.applyMany
      ? await writer.applyMany(job.workspaceId, changes, job.ruleId, job.includeUnknown)
      : (await Promise.all(changes.map(async (item) => await writer.apply(job.workspaceId, item.id, item.version,
        item.change, job.ruleId, job.includeUnknown) ? item.id : null))).filter((id): id is string => id !== null);
    const applied = appliedIds.length;
    const appliedSet = new Set(appliedIds);
    // Proposals remain immutable; result and audit timestamp commit with the changes.
    for (const status of ['APPLIED', 'SKIPPED']) {
      const ids = items.filter((item) => appliedSet.has(item.transactionId) === (status === 'APPLIED')).map((item) => item.id);
      if (ids.length) await tx.ruleApplicationItem.updateMany({ where: { id: { in: ids }, applicationId: job.id },
        data: { status, appliedAt: status === 'APPLIED' ? new Date() : null } });
    }
    await tx.ruleApplication.update({ where: { id: job.id }, data: {
      applied: { increment: applied }, skipped: { increment: items.length - applied },
      status: items.length < 250 ? 'COMPLETED' : 'QUEUED', attempts: 0,
      leaseUntil: null, leaseToken: null, errorCode: null,
    } });
  }, { timeout: 60_000 });
}
