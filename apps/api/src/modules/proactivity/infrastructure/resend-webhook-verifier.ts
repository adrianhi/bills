import crypto from 'node:crypto';

export interface ResendWebhookEvent {
  type: string; created_at: string; data: { email_id?: string };
}

export function verifyResendWebhook(input: {
  payload: Buffer; id?: string; timestamp?: string; signature?: string; secret: string; now?: Date;
}): ResendWebhookEvent | null {
  if (!input.id || !input.timestamp || !input.signature || !input.secret.startsWith('whsec_')) return null;
  const timestamp = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now || new Date()).getTime() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 5 * 60) return null;
  try {
    const secret = Buffer.from(input.secret.slice('whsec_'.length), 'base64');
    if (secret.length < 16) return null;
    const signed = `${input.id}.${input.timestamp}.${input.payload.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secret).update(signed).digest();
    const matches = input.signature.split(' ').some((candidate) => {
      const [, encoded] = candidate.split(',', 2);
      if (!encoded) return false;
      const received = Buffer.from(encoded, 'base64');
      return received.length === expected.length && crypto.timingSafeEqual(received, expected);
    });
    if (!matches) return null;
    const event = JSON.parse(input.payload.toString('utf8')) as ResendWebhookEvent;
    return typeof event.type === 'string' && typeof event.created_at === 'string' && typeof event.data?.email_id === 'string'
      ? event : null;
  } catch { return null; }
}
