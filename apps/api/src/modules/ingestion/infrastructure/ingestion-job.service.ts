import crypto from 'crypto';
import type { IngestionJobType, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { config } from '../../../config';
import { AppError } from '../../../errors/app-error';
import { GmailConnectionService, gmailInitialCutoff } from '../../connections/infrastructure/gmail-connection.service';
import { InstitutionSelectionService } from '../../connections/infrastructure/institution-selection.service';

type JobPayload = {
  historyId?: string;
  pubsubMessageId?: string;
  bank?: string;
  errors?: string[];
  parserVersion?: string;
  statuses?: Array<'FAILED' | 'IGNORED'>;
  institutionCode?: string;
};

function errorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) return String(error.code);
  return error instanceof Error ? error.name : 'INGESTION_JOB_FAILED';
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 300) : 'Unknown ingestion job error';
}

function timeBucket(date: Date, minutes: number) {
  return Math.floor(date.getTime() / (minutes * 60_000));
}

export class IngestionJobService {
  public static async enqueue(input: {
    workspaceId: string;
    inboxConnectionId: string;
    type: IngestionJobType;
    dedupeKey: string;
    payload?: JobPayload;
  }) {
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

  public static enqueueInitial(workspaceId: string, inboxConnectionId: string) {
    return this.enqueue({
      workspaceId,
      inboxConnectionId,
      type: 'GMAIL_INITIAL_BACKFILL',
      dedupeKey: `gmail-initial:${inboxConnectionId}:${crypto.randomUUID()}`,
    });
  }

  public static enqueueWatch(workspaceId: string, inboxConnectionId: string) {
    return this.enqueue({
      workspaceId,
      inboxConnectionId,
      type: 'GMAIL_WATCH_RENEWAL',
      dedupeKey: `gmail-watch:${inboxConnectionId}:${timeBucket(new Date(), 24 * 60)}`,
    });
  }

  public static async enqueueBankBackfill(workspaceId: string, inboxConnectionId: string, institutionCode: string) {
    const code = institutionCode.trim().toUpperCase();
    const cutoff = gmailInitialCutoff().toISOString().slice(0, 7);
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
        errorCode: null, errorMessage: null, processedAt: null,
        payload: { institutionCode: code },
      },
    });
  }

  public static async enqueueManual(workspaceId: string, inboxConnectionId: string) {
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: inboxConnectionId, workspaceId, provider: 'GOOGLE', status: { not: 'REVOKED' } },
      select: { id: true },
    });
    if (!connection) {
      throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    }
    if (!(await InstitutionSelectionService.enabledCodes(inboxConnectionId)).length) {
      throw new AppError(409, 'BANK_SELECTION_REQUIRED', 'Select at least one bank before synchronizing Gmail.');
    }
    return this.enqueue({
      workspaceId,
      inboxConnectionId,
      type: 'GMAIL_RECONCILIATION',
      dedupeKey: `gmail-manual:${inboxConnectionId}:${crypto.randomUUID()}`,
    });
  }

  public static enqueuePush(
    workspaceId: string,
    inboxConnectionId: string,
    pubsubMessageId: string,
    historyId: string
  ) {
    return this.enqueue({
      workspaceId,
      inboxConnectionId,
      type: 'GMAIL_HISTORY_SYNC',
      dedupeKey: `gmail-push:${inboxConnectionId}:${pubsubMessageId}`,
      payload: { historyId, pubsubMessageId },
    });
  }

  public static enqueueReplay(
    workspaceId: string,
    inboxConnectionId: string,
    filters: Pick<JobPayload, 'bank' | 'errors' | 'parserVersion' | 'statuses'> = {}
  ) {
    return this.enqueue({
      workspaceId,
      inboxConnectionId,
      type: 'GMAIL_FAILED_REPLAY',
      dedupeKey: `gmail-replay-admin:${inboxConnectionId}:${crypto.randomUUID()}`,
      payload: filters,
    });
  }

  public static async scheduleDue(now = new Date()) {
    const connections = await prisma.inboxConnection.findMany({
      where: { provider: 'GOOGLE', status: 'ACTIVE' },
      select: {
        id: true,
        workspaceId: true,
        nextReconcileAt: true,
        watchExpiresAt: true,
        _count: {
          select: {
            ingestionEvents: { where: { provider: 'GOOGLE_GMAIL', status: 'FAILED' } },
            institutionSubscriptions: { where: { enabled: true } },
          },
        },
      },
    });

    for (const connection of connections) {
      if (connection._count.institutionSubscriptions === 0) continue;
      if (!connection.nextReconcileAt || connection.nextReconcileAt <= now) {
        await this.enqueue({
          workspaceId: connection.workspaceId,
          inboxConnectionId: connection.id,
          type: 'GMAIL_RECONCILIATION',
          dedupeKey: `gmail-reconcile:${connection.id}:${timeBucket(now, config.gmailReconcileIntervalMinutes)}`,
        });
        await prisma.inboxConnection.update({
          where: { id: connection.id },
          data: { nextReconcileAt: new Date(now.getTime() + config.gmailReconcileIntervalMinutes * 60_000) },
        });
      }

      const renewalThreshold = new Date(now.getTime() + config.gmailWatchRenewalHours * 60 * 60_000);
      if (config.googlePubSubTopic && (!connection.watchExpiresAt || connection.watchExpiresAt <= renewalThreshold)) {
        await this.enqueueWatch(connection.workspaceId, connection.id);
      }

      if (connection._count.ingestionEvents > 0) {
        await this.enqueue({
          workspaceId: connection.workspaceId,
          inboxConnectionId: connection.id,
          type: 'GMAIL_FAILED_REPLAY',
          dedupeKey: `gmail-replay:${connection.id}:${timeBucket(now, 24 * 60)}`,
        });
      }
    }
  }

  public static async processNext(onlyJobIds: string[] = []) {
    const now = new Date();
    const candidateWhere: Prisma.IngestionJobWhereInput = {
        ...(onlyJobIds.length ? { id: { in: onlyJobIds } } : {}),
        OR: [
          {
            status: { in: ['PENDING', 'FAILED'] },
            nextAttemptAt: { lte: now },
            OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
          },
          { status: 'PROCESSING', leaseUntil: { lte: now } },
        ],
      };
    const priorityTypes: IngestionJobType[] = [
      'GMAIL_HISTORY_SYNC',
      'GMAIL_RECONCILIATION',
      'GMAIL_WATCH_RENEWAL',
      'GMAIL_FAILED_REPLAY',
    ];
    const candidate = await prisma.ingestionJob.findFirst({
      where: { ...candidateWhere, type: { in: priorityTypes } },
      orderBy: { createdAt: 'asc' },
    }) || await prisma.ingestionJob.findFirst({
      where: candidateWhere,
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) return false;

    if (candidate.attempts >= candidate.maxAttempts) {
      await prisma.ingestionJob.update({
        where: { id: candidate.id },
        data: {
          status: 'FAILED',
          leaseUntil: null,
          nextAttemptAt: new Date('9999-12-31T23:59:59.999Z'),
        },
      });
      return true;
    }
    const claimed = await prisma.ingestionJob.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        attempts: candidate.attempts,
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        leaseUntil: new Date(now.getTime() + 60_000),
        startedAt: now,
        errorCode: null,
        errorMessage: null,
      },
    });
    if (claimed.count !== 1) return true;

    const heartbeat = setInterval(() => {
      void prisma.ingestionJob.updateMany({
        where: { id: candidate.id, status: 'PROCESSING' },
        data: { leaseUntil: new Date(Date.now() + 60_000) },
      }).catch(() => undefined);
    }, 15_000);
    heartbeat.unref();

    try {
      let result: unknown;
      const payload = (candidate.payload as JobPayload | null) || {};
      const selectedInstitutions = await InstitutionSelectionService.enabledCodes(candidate.inboxConnectionId);
      if (!selectedInstitutions.length) {
        result = { skipped: true, reason: 'BANK_SELECTION_REQUIRED' };
      } else if (
        candidate.type === 'GMAIL_BANK_BACKFILL'
        && payload.institutionCode
        && !selectedInstitutions.includes(payload.institutionCode.trim().toUpperCase())
      ) {
        result = { skipped: true, reason: 'BANK_NOT_SELECTED' };
      } else switch (candidate.type) {
        case 'GMAIL_INITIAL_BACKFILL':
          result = await GmailConnectionService.syncFull(candidate.workspaceId, candidate.inboxConnectionId, true);
          break;
        case 'GMAIL_BANK_BACKFILL':
          if (!payload.institutionCode) throw new AppError(400, 'BANK_BACKFILL_INVALID', 'Bank backfill is missing its institution.');
          result = await GmailConnectionService.syncBankBackfill(
            candidate.workspaceId,
            candidate.inboxConnectionId,
            payload.institutionCode
          );
          break;
        case 'GMAIL_WATCH_RENEWAL':
          result = await GmailConnectionService.registerWatch(candidate.workspaceId, candidate.inboxConnectionId);
          break;
        case 'GMAIL_FAILED_REPLAY':
          result = await GmailConnectionService.replayFailed(
            candidate.workspaceId,
            candidate.inboxConnectionId,
            {
              bank: payload.bank,
              errors: payload.errors,
              parserVersion: payload.parserVersion,
              statuses: payload.statuses,
            }
          );
          break;
        case 'GMAIL_HISTORY_SYNC':
        case 'GMAIL_RECONCILIATION':
          result = await GmailConnectionService.syncIncremental(candidate.workspaceId, candidate.inboxConnectionId);
          break;
      }
      await prisma.ingestionJob.update({
        where: { id: candidate.id },
        data: {
          status: 'SUCCEEDED',
          processedAt: new Date(),
          leaseUntil: null,
          payload: {
            ...payload,
            result: (result ?? {}) as Prisma.InputJsonValue,
          },
        },
      });
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const exhausted = attempts >= candidate.maxAttempts;
      await prisma.ingestionJob.update({
        where: { id: candidate.id },
        data: {
          status: 'FAILED',
          leaseUntil: null,
          errorCode: errorCode(error),
          errorMessage: errorMessage(error),
          nextAttemptAt: exhausted
            ? new Date('9999-12-31T23:59:59.999Z')
            : new Date(Date.now() + Math.pow(2, attempts) * 30_000),
        },
      });
      await prisma.inboxConnection.update({
        where: { id: candidate.inboxConnectionId },
        data: { lastErrorCode: errorCode(error) },
      });
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }
}
