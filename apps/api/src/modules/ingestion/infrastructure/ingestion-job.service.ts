import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { gmailInitialCutoff } from '../../connections';
import { config } from '../../../config';
import { InstitutionSelectionService } from '../../connections/infrastructure/institution-selection.service';
import { GmailJobHandlerRegistry } from '../application/gmail-job-handler.registry';
import type {
  EnqueueJobInput,
  IngestionJobProcessor,
  IngestionJobQueue,
  JobPayload,
  IngestionJobKind,
} from '../application/ingestion-job.port';
import { IngestionScheduler } from './ingestion-scheduler';

const NEVER_RETRY = new Date('9999-12-31T23:59:59.999Z');

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) return String(error.code);
  return error instanceof Error ? error.name : 'INGESTION_JOB_FAILED';
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 300)
    : 'Unknown ingestion job error';
}

function timeBucket(date: Date, minutes: number): number {
  return Math.floor(date.getTime() / (minutes * 60_000));
}

export class IngestionJobService implements IngestionJobQueue, IngestionJobProcessor {
  public constructor(
    private readonly handlers: GmailJobHandlerRegistry,
    private readonly scheduler: IngestionScheduler
  ) {}

  public enqueue(input: EnqueueJobInput) {
    return prisma.ingestionJob.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        workspaceId: input.workspaceId,
        inboxConnectionId: input.inboxConnectionId,
        type: input.type,
        dedupeKey: input.dedupeKey,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
      update: {},
    });
  }

  public enqueueInitial(workspaceId: string, inboxConnectionId: string) {
    return this.enqueue({
      workspaceId, inboxConnectionId, type: 'GMAIL_INITIAL_BACKFILL',
      dedupeKey: `gmail-initial:${inboxConnectionId}:${crypto.randomUUID()}`,
    });
  }

  public enqueueWatch(workspaceId: string, inboxConnectionId: string) {
    return this.enqueue({
      workspaceId, inboxConnectionId, type: 'GMAIL_WATCH_RENEWAL',
      dedupeKey: `gmail-watch:${inboxConnectionId}:${timeBucket(new Date(), 24 * 60)}`,
    });
  }

  public async enqueueBankBackfill(workspaceId: string, inboxConnectionId: string, institutionCode: string) {
    const code = institutionCode.trim().toUpperCase();
    const cutoff = gmailInitialCutoff(new Date(), config.gmailInitialSyncMonths).toISOString().slice(0, 7);
    const dedupeKey = `gmail-bank-backfill:${inboxConnectionId}:${code}:${cutoff}`;
    const existing = await prisma.ingestionJob.findUnique({ where: { dedupeKey } });
    if (existing && ['PENDING', 'PROCESSING'].includes(existing.status)) return existing;
    return prisma.ingestionJob.upsert({
      where: { dedupeKey },
      create: {
        workspaceId, inboxConnectionId, type: 'GMAIL_BANK_BACKFILL', dedupeKey,
        payload: { institutionCode: code },
      },
      update: {
        status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), leaseUntil: null,
        errorCode: null, errorMessage: null, processedAt: null, payload: { institutionCode: code },
      },
    });
  }

  public async enqueueManual(workspaceId: string, inboxConnectionId: string) {
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: inboxConnectionId, workspaceId, provider: 'GOOGLE', status: { not: 'REVOKED' } },
      select: { id: true },
    });
    if (!connection) throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    if (!(await InstitutionSelectionService.enabledCodes(inboxConnectionId)).length) {
      throw new AppError(409, 'BANK_SELECTION_REQUIRED', 'Select at least one bank before synchronizing Gmail.');
    }
    return this.enqueue({
      workspaceId, inboxConnectionId, type: 'GMAIL_RECONCILIATION',
      dedupeKey: `gmail-manual:${inboxConnectionId}:${crypto.randomUUID()}`,
    });
  }

  public enqueuePush(workspaceId: string, inboxConnectionId: string, pubsubMessageId: string, historyId: string) {
    return this.enqueue({
      workspaceId, inboxConnectionId, type: 'GMAIL_HISTORY_SYNC',
      dedupeKey: `gmail-push:${inboxConnectionId}:${pubsubMessageId}`,
      payload: { historyId, pubsubMessageId },
    });
  }

  public enqueueReplay(workspaceId: string, inboxConnectionId: string, filters: Partial<JobPayload> = {}) {
    return this.enqueue({
      workspaceId, inboxConnectionId, type: 'GMAIL_FAILED_REPLAY',
      dedupeKey: `gmail-replay-admin:${inboxConnectionId}:${crypto.randomUUID()}`,
      payload: filters,
    });
  }

  public scheduleDue(now = new Date()): Promise<void> {
    return this.scheduler.scheduleDue(now);
  }

  public async processNext(onlyJobIds: string[] = []): Promise<boolean> {
    const now = new Date();
    const candidate = await this.findCandidate(now, onlyJobIds);
    if (!candidate) return false;
    if (candidate.attempts >= candidate.maxAttempts) {
      await prisma.ingestionJob.update({
        where: { id: candidate.id },
        data: { status: 'FAILED', leaseUntil: null, nextAttemptAt: NEVER_RETRY },
      });
      return true;
    }
    const claimed = await prisma.ingestionJob.updateMany({
      where: {
        id: candidate.id, status: candidate.status, attempts: candidate.attempts,
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      data: {
        status: 'PROCESSING', attempts: { increment: 1 }, leaseUntil: new Date(now.getTime() + 60_000),
        startedAt: now, errorCode: null, errorMessage: null,
      },
    });
    if (claimed.count !== 1) return true;
    const heartbeat = this.startHeartbeat(candidate.id);
    try {
      const payload = (candidate.payload as JobPayload | null) || {};
      const selected = await InstitutionSelectionService.enabledCodes(candidate.inboxConnectionId);
      const bankRemoved = candidate.type === 'GMAIL_BANK_BACKFILL'
        && payload.institutionCode
        && !selected.includes(payload.institutionCode.trim().toUpperCase());
      const result = !selected.length
        ? { skipped: true, reason: 'BANK_SELECTION_REQUIRED' }
        : bankRemoved
          ? { skipped: true, reason: 'BANK_NOT_SELECTED' }
          : await this.handlers.execute(candidate.type, {
              workspaceId: candidate.workspaceId,
              inboxConnectionId: candidate.inboxConnectionId,
              payload,
            });
      await prisma.ingestionJob.update({
        where: { id: candidate.id },
        data: {
          status: 'SUCCEEDED', processedAt: new Date(), leaseUntil: null,
          payload: { ...payload, result: (result ?? {}) as Prisma.InputJsonValue },
        },
      });
    } catch (error) {
      await this.fail(candidate.id, candidate.inboxConnectionId, candidate.attempts + 1, candidate.maxAttempts, error);
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }

  private async findCandidate(now: Date, onlyJobIds: string[]) {
    const where: Prisma.IngestionJobWhereInput = {
      ...(onlyJobIds.length ? { id: { in: onlyJobIds } } : {}),
      OR: [
        { status: { in: ['PENDING', 'FAILED'] }, nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
        { status: 'PROCESSING', leaseUntil: { lte: now } },
      ],
    };
    const priority: IngestionJobKind[] = ['GMAIL_HISTORY_SYNC', 'GMAIL_RECONCILIATION', 'GMAIL_WATCH_RENEWAL', 'GMAIL_FAILED_REPLAY'];
    return await prisma.ingestionJob.findFirst({ where: { ...where, type: { in: priority } }, orderBy: { createdAt: 'asc' } })
      || prisma.ingestionJob.findFirst({ where, orderBy: { createdAt: 'asc' } });
  }

  private startHeartbeat(jobId: string): NodeJS.Timeout {
    const heartbeat = setInterval(() => {
      void prisma.ingestionJob.updateMany({
        where: { id: jobId, status: 'PROCESSING' }, data: { leaseUntil: new Date(Date.now() + 60_000) },
      }).catch(() => undefined);
    }, 15_000);
    heartbeat.unref();
    return heartbeat;
  }

  private async fail(jobId: string, connectionId: string, attempts: number, maxAttempts: number, error: unknown) {
    const exhausted = attempts >= maxAttempts;
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED', leaseUntil: null, errorCode: errorCode(error), errorMessage: errorMessage(error),
        nextAttemptAt: exhausted ? NEVER_RETRY : new Date(Date.now() + Math.pow(2, attempts) * 30_000),
      },
    });
    await prisma.inboxConnection.update({ where: { id: connectionId }, data: { lastErrorCode: errorCode(error) } });
  }
}
