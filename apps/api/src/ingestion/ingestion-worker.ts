import crypto from 'crypto';
import { Resend } from 'resend';
import { prisma } from '../config/database';
import { config } from '../config';
import { ParserRegistry } from './parser-registry';
import type { NormalizedEmail } from './types';
import { CreateTransactionSchema } from '../schemas/transaction.schema';
import { TransactionService } from '../services/transaction.service';

const MAX_ATTEMPTS = 5;
const FAILED_CONTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function encryptionKey() {
  if (!config.ingestionEncryptionKey) return null;
  const key = Buffer.from(config.ingestionEncryptionKey, 'base64');
  return key.length === 32 ? key : null;
}

function encryptForRetention(value: string) {
  const key = encryptionKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function sanitizeError(error: unknown) {
  if (!(error instanceof Error)) return 'Unknown ingestion error';
  return error.message.replace(/[\r\n]+/g, ' ').slice(0, 300);
}

export class IngestionWorker {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(config.resendApiKey);
  }

  public async processNext(): Promise<boolean> {
    const now = new Date();
    const candidate = await prisma.ingestionEvent.findFirst({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: MAX_ATTEMPTS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      include: { bankConnection: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) return false;

    const claimed = await prisma.ingestionEvent.updateMany({
      where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, errorCode: null, errorMessage: null },
    });
    if (claimed.count === 0) return true;

    let emailForRetention: NormalizedEmail | null = null;
    try {
      if (!candidate.providerEmailId || !candidate.bankConnection) {
        throw new Error('INGESTION_EVENT_INCOMPLETE');
      }

      const response = await this.resend.emails.receiving.get(candidate.providerEmailId, {
        html_format: 'cid',
      });
      if (response.error || !response.data) throw new Error('RESEND_EMAIL_FETCH_FAILED');

      const email: NormalizedEmail = {
        id: response.data.id,
        messageId: response.data.message_id || response.data.id,
        from: response.data.from,
        to: response.data.to,
        subject: response.data.subject,
        html: response.data.html,
        text: response.data.text,
        headers: response.data.headers,
        receivedAt: new Date(response.data.created_at),
      };
      emailForRetention = email;

      const parser = ParserRegistry.forInstitution(candidate.bankConnection.institutionCode);
      if (!parser) throw new Error('PARSER_NOT_AVAILABLE');
      if (!parser.canParse(email)) throw new Error('SENDER_DOES_NOT_MATCH_INSTITUTION');
      const result = await parser.parse(email);

      if (result.status === 'unsupported') throw new Error(result.reason);
      if (result.status === 'ignored') {
        await prisma.ingestionEvent.update({
          where: { id: candidate.id },
          data: {
            status: 'IGNORED',
            parserCode: parser.institutionCode,
            parserVersion: parser.version,
            errorCode: result.reason,
            processedAt: new Date(),
            rawContent: null,
            rawContentExpiresAt: null,
          },
        });
        return true;
      }

      for (const transaction of result.transactions) {
        const input = CreateTransactionSchema.parse(transaction);
        await TransactionService.createTransaction(candidate.workspaceId, input);
      }

      await prisma.$transaction([
        prisma.ingestionEvent.update({
          where: { id: candidate.id },
          data: {
            status: 'SUCCEEDED',
            parserCode: parser.institutionCode,
            parserVersion: parser.version,
            processedAt: new Date(),
            rawContent: null,
            rawContentExpiresAt: null,
          },
        }),
        prisma.bankConnection.update({
          where: { id: candidate.bankConnection.id },
          data: { status: 'ACTIVE', lastEventAt: new Date(), lastErrorCode: null },
        }),
      ]);
      return true;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const retainable = emailForRetention
        ? encryptForRetention(
            JSON.stringify({
              id: emailForRetention.id,
              from: emailForRetention.from,
              to: emailForRetention.to,
              subject: emailForRetention.subject,
              html: emailForRetention.html,
              text: emailForRetention.text,
            })
          )
        : null;
      const code = sanitizeError(error);
      await prisma.$transaction([
        prisma.ingestionEvent.update({
          where: { id: candidate.id },
          data: {
            status: 'FAILED',
            errorCode: code,
            errorMessage: code,
            nextAttemptAt:
              attempts < MAX_ATTEMPTS ? new Date(Date.now() + Math.pow(2, attempts) * 30_000) : null,
            rawContent: retainable,
            rawContentExpiresAt: retainable ? new Date(Date.now() + FAILED_CONTENT_TTL_MS) : null,
          },
        }),
        ...(candidate.bankConnection
          ? [
              prisma.bankConnection.update({
                where: { id: candidate.bankConnection.id },
                data: { status: 'ERROR', lastErrorCode: code },
              }),
            ]
          : []),
      ]);
      return true;
    }
  }

  public async purgeExpiredRawContent() {
    await prisma.ingestionEvent.updateMany({
      where: { rawContentExpiresAt: { lte: new Date() } },
      data: { rawContent: null, rawContentExpiresAt: null },
    });
  }
}
