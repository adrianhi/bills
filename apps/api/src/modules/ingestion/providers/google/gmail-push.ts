import { config } from '../../../../config';
import { AppError } from '../../../../errors/app-error';

export interface GoogleTokenInfo { aud?: string; email?: string; email_verified?: string | boolean; exp?: string; iss?: string }
export interface GmailPushMessage { emailAddress: string; historyId: string; messageId: string }

export function decodeGmailPush(body: unknown): GmailPushMessage {
  const envelope = body as { message?: { data?: unknown; messageId?: unknown } } | null;
  if (typeof envelope?.message?.data !== 'string' || typeof envelope.message.messageId !== 'string') throw new AppError(400, 'INVALID_GMAIL_PUSH_BODY', 'Gmail push envelope is invalid.');
  let payload: unknown;
  try { payload = JSON.parse(Buffer.from(envelope.message.data, 'base64').toString('utf8')); }
  catch { throw new AppError(400, 'INVALID_GMAIL_PUSH_DATA', 'Gmail push data is invalid.'); }
  const parsed = payload as { emailAddress?: unknown; historyId?: unknown };
  if (typeof parsed.emailAddress !== 'string' || typeof parsed.historyId !== 'string') throw new AppError(400, 'INVALID_GMAIL_PUSH_DATA', 'Gmail push data is incomplete.');
  return { emailAddress: parsed.emailAddress.trim().toLowerCase(), historyId: parsed.historyId, messageId: envelope.message.messageId };
}

export function validateGooglePushClaims(claims: GoogleTokenInfo) {
  const issuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  if (!issuer || !verified || claims.aud !== config.googlePubSubPushAudience || claims.email?.toLowerCase() !== config.googlePubSubPushServiceAccount.toLowerCase() || Number(claims.exp || 0) * 1000 <= Date.now()) throw new AppError(401, 'INVALID_GOOGLE_PUSH_TOKEN', 'Google push token is invalid.');
}
