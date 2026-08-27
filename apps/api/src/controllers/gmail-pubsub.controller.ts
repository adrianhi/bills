import { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from '../errors/app-error';
import { IngestionJobService } from '../services/ingestion-job.service';

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  iss?: string;
};

export type GmailPushMessage = {
  emailAddress: string;
  historyId: string;
  messageId: string;
};

export function decodeGmailPush(body: unknown): GmailPushMessage {
  const envelope = body as { message?: { data?: unknown; messageId?: unknown } } | null;
  const data = envelope?.message?.data;
  const messageId = envelope?.message?.messageId;
  if (typeof data !== 'string' || typeof messageId !== 'string' || !data || !messageId) {
    throw new AppError(400, 'INVALID_GMAIL_PUSH_BODY', 'Gmail push envelope is invalid.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_GMAIL_PUSH_DATA', 'Gmail push data is invalid.');
  }
  const parsed = payload as { emailAddress?: unknown; historyId?: unknown };
  if (typeof parsed.emailAddress !== 'string' || typeof parsed.historyId !== 'string') {
    throw new AppError(400, 'INVALID_GMAIL_PUSH_DATA', 'Gmail push data is incomplete.');
  }
  return {
    emailAddress: parsed.emailAddress.trim().toLowerCase(),
    historyId: parsed.historyId,
    messageId,
  };
}

export function validateGooglePushClaims(claims: GoogleTokenInfo) {
  const issuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  const expiration = Number(claims.exp || 0);
  if (
    !issuer ||
    !verified ||
    claims.aud !== config.googlePubSubPushAudience ||
    claims.email?.toLowerCase() !== config.googlePubSubPushServiceAccount.toLowerCase() ||
    !expiration ||
    expiration * 1000 <= Date.now()
  ) {
    throw new AppError(401, 'INVALID_GOOGLE_PUSH_TOKEN', 'Google push token is invalid.');
  }
}

async function authenticatePush(req: Request) {
  if (!config.googlePubSubPushAudience || !config.googlePubSubPushServiceAccount) {
    throw new AppError(503, 'GOOGLE_PUSH_NOT_CONFIGURED', 'Google push authentication is not configured.');
  }
  const authorization = req.header('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AppError(401, 'GOOGLE_PUSH_TOKEN_MISSING', 'Google push token is missing.');

  const tokenInfo = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(match[1])}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!tokenInfo.ok) {
    throw new AppError(401, 'INVALID_GOOGLE_PUSH_TOKEN', 'Google push token is invalid.');
  }
  validateGooglePushClaims((await tokenInfo.json()) as GoogleTokenInfo);
}

export class GmailPubSubController {
  public static async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authenticatePush(req);
      const push = decodeGmailPush(req.body);
      const connections = await prisma.inboxConnection.findMany({
        where: {
          provider: 'GOOGLE',
          status: 'ACTIVE',
          OR: [{ providerAccountId: push.emailAddress }, { email: push.emailAddress }],
        },
        select: { id: true, workspaceId: true },
      });
      await Promise.all(
        connections.map((connection) =>
          IngestionJobService.enqueuePush(
            connection.workspaceId,
            connection.id,
            push.messageId,
            push.historyId
          )
        )
      );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
