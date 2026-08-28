import { Resend } from 'resend';
import { prisma } from '../../../config/database';
import { config } from '../../../config';
import type { NormalizedEmail } from '../../../ingestion/types';
import { SecretCryptoService } from '../../../services/secret-crypto.service';
import { NormalizedEmailProcessor } from '../../../ingestion/normalized-email.processor';

const MAX_ATTEMPTS = 5;
const FAILED_CONTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function encryptForRetention(value: string) {
  try {
    return SecretCryptoService.encrypt(value);
  } catch {
    return null;
  }
}

function sanitizeError(error: unknown) {
  if (!(error instanceof Error)) return 'Unknown ingestion error';
  return error.message.replace(/[\r\n]+/g, ' ').slice(0, 300);
}

export class IngestionWorker {
  private readonly resend: Resend | null;

  constructor() {
    this.resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
  }

  public async processNext(): Promise<boolean> {
    const now = new Date();
    const candidate = await prisma.ingestionEvent.findFirst({
      where: {
        provider: 'RESEND',
        attempts: { lt: MAX_ATTEMPTS },
        OR: [
          {
            status: { in: ['PENDING', 'FAILED'] },
            AND: [
              { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
              { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
            ],
          },
          {
            status: 'PROCESSING',
            OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
          },
        ],
      },
      include: { bankConnection: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) return false;

    const claimed = await prisma.ingestionEvent.updateMany({
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
        errorCode: null,
        errorMessage: null,
      },
    });
    if (claimed.count === 0) return true;

    const heartbeat = setInterval(() => {
      void prisma.ingestionEvent.updateMany({
        where: { id: candidate.id, status: 'PROCESSING' },
        data: { leaseUntil: new Date(Date.now() + 60_000) },
      }).catch(() => undefined);
    }, 15_000);
    heartbeat.unref();

    let emailForRetention: NormalizedEmail | null = null;
    try {
      if (!candidate.providerEmailId || !candidate.bankConnection) {
        throw new Error('INGESTION_EVENT_INCOMPLETE');
      }
      if (!this.resend) throw new Error('RESEND_API_KEY_NOT_CONFIGURED');

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

      const result = await NormalizedEmailProcessor.process({
        workspaceId: candidate.workspaceId,
        email,
        ingestionChannel: 'EMAIL_FORWARD',
        institutionCode: candidate.bankConnection.institutionCode,
        bankConnectionId: candidate.bankConnection.id,
        sourceEmail: candidate.bankConnection.sourceEmail || undefined,
      });

      if (result.status === 'unsupported') throw new Error(result.reason);
      if (result.status === 'ignored') {
        await prisma.ingestionEvent.update({
          where: { id: candidate.id },
          data: {
            status: 'IGNORED',
            parserCode: result.parserCode,
            parserVersion: result.parserVersion,
            errorCode: result.reason,
            processedAt: new Date(),
            leaseUntil: null,
            rawContent: null,
            rawContentExpiresAt: null,
          },
        });
        return true;
      }

      await prisma.$transaction([
        prisma.ingestionEvent.update({
          where: { id: candidate.id },
          data: {
            status: 'SUCCEEDED',
            parserCode: result.parserCode,
            parserVersion: result.parserVersion,
            processedAt: new Date(),
            leaseUntil: null,
            rawContent: null,
            rawContentExpiresAt: null,
          },
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
            leaseUntil: null,
            errorCode: code,
            errorMessage: code,
            nextAttemptAt:
              attempts < MAX_ATTEMPTS ? new Date(Date.now() + Math.pow(2, attempts) * 30_000) : null,
            rawContent: retainable ?? candidate.rawContent,
            rawContentExpiresAt: candidate.rawContentExpiresAt
              ?? (retainable ? new Date(Date.now() + FAILED_CONTENT_TTL_MS) : null),
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
    } finally {
      clearInterval(heartbeat);
    }
  }

  public async purgeExpiredRawContent() {
    await prisma.ingestionEvent.updateMany({
      where: { rawContentExpiresAt: { lte: new Date() } },
      data: { rawContent: null, rawContentExpiresAt: null },
    });
  }
}
