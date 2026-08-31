import { Prisma } from '@prisma/client';
import { config } from '../../../../config';
import { prisma } from '../../../../config/database';
import { AppError } from '../../../../errors/app-error';
import { NormalizedEmailProcessor } from '../../../../ingestion/normalized-email.processor';
import { ParserRegistry } from '../../../../ingestion/parser-registry';
import type { NormalizedEmail } from '../../../../ingestion/types';
import { InstitutionSelectionService } from '../../../connections/infrastructure/institution-selection.service';
import { GoogleGmailClient, normalizeGmailMessage } from '../../../connections/infrastructure/google/google-gmail.client';
import type { SyncSummary } from '../../../connections/infrastructure/google/gmail-types';
import { retainEmail } from './retained-email';

const FAILED_CONTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type ReplayStatus = 'FAILED' | 'PENDING' | 'IGNORED';

interface ProcessMessageInput {
  workspaceId: string;
  connection: { id: string; email: string };
  accessToken: string;
  messageId: string;
  summary: SyncSummary;
  allowReplay?: boolean;
  replayStatuses?: ReplayStatus[];
  retainedEmail?: NormalizedEmail | null;
}

export class GmailMessageProcessor {
  public constructor(private readonly google: GoogleGmailClient) {}

  public async processIds(
    workspaceId: string,
    connection: { id: string; email: string },
    accessToken: string,
    messageIds: string[],
    summary: SyncSummary,
    concurrency = config.gmailSyncConcurrency,
    requiredInstitutionCode?: string
  ): Promise<void> {
    summary.scanned += messageIds.length;
    for (let index = 0; index < messageIds.length; index += concurrency) {
      if (requiredInstitutionCode) {
        const selected = await InstitutionSelectionService.enabledCodes(connection.id);
        if (!selected.includes(requiredInstitutionCode)) break;
      }
      const chunk = messageIds.slice(index, index + concurrency);
      await Promise.all(chunk.map((messageId) => this.process({
        workspaceId, connection, accessToken, messageId, summary,
      })));
    }
  }

  public async process(input: ProcessMessageInput): Promise<void> {
    const providerEventId = `gmail:${input.connection.id}:${input.messageId}`;
    const existing = await prisma.ingestionEvent.findUnique({ where: { providerEventId } });
    let eventId = existing?.id || '';
    if (existing) {
      const statuses = input.replayStatuses || ['FAILED', 'PENDING'];
      if (!input.allowReplay || !statuses.includes(existing.status as ReplayStatus)) {
        input.summary.duplicates += 1;
        return;
      }
      const claimed = await prisma.ingestionEvent.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status: 'PROCESSING', attempts: { increment: 1 }, errorCode: null, errorMessage: null, nextAttemptAt: null },
      });
      if (claimed.count !== 1) {
        input.summary.duplicates += 1;
        return;
      }
    } else {
      try {
        const event = await prisma.ingestionEvent.create({
          data: {
            workspaceId: input.workspaceId,
            inboxConnectionId: input.connection.id,
            provider: 'GOOGLE_GMAIL',
            providerEventId,
            providerEmailId: input.messageId,
            status: 'PROCESSING',
            attempts: 1,
          },
        });
        eventId = event.id;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          input.summary.duplicates += 1;
          return;
        }
        throw error;
      }
    }

    let normalized = input.retainedEmail || null;
    try {
      if (!normalized) normalized = normalizeGmailMessage(await this.google.message(input.accessToken, input.messageId));
      const result = await NormalizedEmailProcessor.process({
        workspaceId: input.workspaceId,
        email: normalized,
        ingestionChannel: 'GMAIL_OAUTH',
        inboxConnectionId: input.connection.id,
        sourceEmail: input.connection.email,
      });
      if (result.status === 'parsed') {
        input.summary.parsed += 1;
        input.summary.created += result.created;
        input.summary.duplicates += result.duplicates;
        await prisma.ingestionEvent.update({
          where: { id: eventId },
          data: {
            status: 'SUCCEEDED', bankConnectionId: result.bankConnectionId,
            parserCode: result.parserCode, parserVersion: result.parserVersion,
            errorCode: null, errorMessage: null, rawContent: null,
            rawContentExpiresAt: null, processedAt: new Date(),
          },
        });
        return;
      }
      if (result.status === 'ignored') {
        input.summary.ignored += 1;
        await prisma.ingestionEvent.update({
          where: { id: eventId },
          data: {
            status: 'IGNORED', parserCode: result.parserCode, parserVersion: result.parserVersion,
            errorCode: result.reason, errorMessage: null, rawContent: null,
            rawContentExpiresAt: null, processedAt: new Date(),
          },
        });
        return;
      }
      input.summary.failed += 1;
      await prisma.ingestionEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED', parserCode: result.parserCode, parserVersion: result.parserVersion,
          errorCode: result.reason, errorMessage: result.reason, rawContent: retainEmail(normalized),
          rawContentExpiresAt: existing?.rawContentExpiresAt ?? new Date(Date.now() + FAILED_CONTENT_TTL_MS),
          nextAttemptAt: null,
        },
      });
    } catch (error) {
      input.summary.failed += 1;
      const code = error instanceof AppError ? error.code : 'GMAIL_MESSAGE_PROCESSING_FAILED';
      const parser = normalized ? ParserRegistry.detect(normalized) : null;
      await prisma.ingestionEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED', parserCode: parser?.institutionCode || existing?.parserCode,
          parserVersion: parser?.version || existing?.parserVersion, errorCode: code, errorMessage: code,
          rawContent: normalized ? retainEmail(normalized) : existing?.rawContent,
          rawContentExpiresAt: existing?.rawContentExpiresAt
            ?? (normalized || existing?.rawContent ? new Date(Date.now() + FAILED_CONTENT_TTL_MS) : null),
          nextAttemptAt: null,
        },
      });
    }
  }
}
