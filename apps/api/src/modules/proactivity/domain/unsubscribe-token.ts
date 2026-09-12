import crypto from 'node:crypto';

export type UnsubscribeCategory = 'WEEKLY_DIGEST' | 'CRITICAL_ALERTS';
export interface UnsubscribeClaims {
  v: 1; workspaceId: string; profileId: string; category: UnsubscribeCategory; iat: number; exp: number;
}

export function createUnsubscribeToken(
  input: Omit<UnsubscribeClaims, 'v' | 'iat' | 'exp'>,
  secret: string,
  now = new Date(),
): string {
  if (secret.length < 32) throw new Error('EMAIL_UNSUBSCRIBE_SECRET_TOO_SHORT');
  const iat = Math.floor(now.getTime() / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, ...input, iat, exp: iat + 180 * 86_400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyUnsubscribeToken(token: string, secret: string, now = new Date()): UnsubscribeClaims | null {
  if (secret.length < 32) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UnsubscribeClaims;
    const validCategory = claims.category === 'WEEKLY_DIGEST' || claims.category === 'CRITICAL_ALERTS';
    return claims.v === 1 && validCategory && claims.exp >= Math.floor(now.getTime() / 1000)
      && Boolean(claims.workspaceId) && Boolean(claims.profileId) ? claims : null;
  } catch { return null; }
}
