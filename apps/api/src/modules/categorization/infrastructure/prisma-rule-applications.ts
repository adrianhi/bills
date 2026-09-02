import crypto from 'node:crypto';
import { ruleApplicationSchema } from '@bills/contracts';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { visibleTransactionWhere } from '../../transactions';
import type { ApplicationJob, RuleApplications } from '../application/rule-application.port';
import type { PreviewDecision } from '../domain/preview-decision';
import { checkpointPreview, applyClassificationBatch, type ClassificationWriterFactory } from './rule-application-checkpoints';

export class PrismaRuleApplications implements RuleApplications {
  constructor(private readonly writer: ClassificationWriterFactory) {}
  async get(workspaceId: string, id: string) {
    const job = await prisma.ruleApplication.findFirst({ where: { id, workspaceId },
      include: { items: { take: 20, orderBy: { transactionId: 'asc' } } } });
    if (!job) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Aplicación no encontrada.');
    const visible = new Set((await prisma.transaction.findMany({
      where: { workspaceId, id: { in: job.items.map((item) => item.transactionId) }, ...visibleTransactionWhere() }, select: { id: true },
    })).map((row) => row.id));
    const target = (job.rulesSnapshot as unknown as ApplicationJob['rulesSnapshot']).find((rule) => rule.id === job.ruleId);
    return ruleApplicationSchema.parse({ ...job, ruleLabel: target?.pattern || '', ruleCategory: target?.category || '',
      startDate: job.startDate?.toISOString().slice(0, 10) || null, endDate: job.endDate ? new Date(job.endDate.getTime() - 4 * 3600_000).toISOString().slice(0, 10) : null,
      createdAt: job.createdAt.toISOString(), sample: job.items.filter((item) => visible.has(item.transactionId)).map((item) => {
      const before = item.before as { category: string; merchant: string };
      const after = item.after as { category: string; merchant: string };
      return { transactionId: item.transactionId, ...before, nextMerchant: after.merchant, nextCategory: after.category, reason: item.reason };
    }) });
  }
  async recent(workspaceId: string) {
    const jobs = await prisma.ruleApplication.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true } });
    return Promise.all(jobs.map((job) => this.get(workspaceId, job.id)));
  }
  async claim(): Promise<ApplicationJob | null> {
    return prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM rule_applications WHERE
          (status = 'QUEUED' AND next_attempt_at <= NOW()) OR (status = 'PROCESSING' AND lease_until < NOW())
        ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!ids[0]) return null;
      const job = await tx.ruleApplication.update({ where: { id: ids[0].id }, data: {
        status: 'PROCESSING', leaseToken: crypto.randomUUID(), leaseUntil: new Date(Date.now() + 120_000), attempts: { increment: 1 },
      } });
      return { ...job, rulesSnapshot: job.rulesSnapshot as unknown as ApplicationJob['rulesSnapshot'] };
    });
  }
  checkpoint(job: ApplicationJob, rows: PreviewDecision[], scanned: number, cursor: string | null, complete: boolean) {
    return checkpointPreview(job, rows, scanned, cursor, complete);
  }
  applyBatch(job: ApplicationJob) { return applyClassificationBatch(job, this.writer); }
  async fail(job: ApplicationJob) {
    const current = await prisma.ruleApplication.findFirst({ where: { id: job.id, leaseToken: job.leaseToken } });
    if (!current) return;
    await prisma.ruleApplication.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: {
      status: current.attempts >= 3 ? 'FAILED' : 'QUEUED', errorCode: 'RULE_APPLICATION_RETRY_REQUIRED',
      nextAttemptAt: new Date(Date.now() + 5000 * 2 ** Math.min(current.attempts, 3)), leaseToken: null, leaseUntil: null,
    } });
  }
}
