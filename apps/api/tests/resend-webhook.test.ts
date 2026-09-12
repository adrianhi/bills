import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyResendWebhook } from '../src/modules/proactivity/infrastructure/resend-webhook-verifier';

describe('Resend webhook verification', () => {
  const rawSecret = Buffer.from('webhook-secret-for-tests').toString('base64');
  const secret = `whsec_${rawSecret}`;
  const payload = Buffer.from(JSON.stringify({
    type: 'email.delivered', created_at: '2026-09-12T12:00:00.000Z', data: { email_id: 'email_123' },
  }));
  const timestamp = '1789214400';
  const signature = crypto.createHmac('sha256', Buffer.from(rawSecret, 'base64'))
    .update(`event_123.${timestamp}.${payload.toString('utf8')}`).digest('base64');

  it('accepts valid raw payloads and rejects tampering or stale requests', () => {
    const input = { payload, id: 'event_123', timestamp, signature: `v1,${signature}`, secret, now: new Date('2026-09-12T12:00:00Z') };
    expect(verifyResendWebhook(input)?.data.email_id).toBe('email_123');
    expect(verifyResendWebhook({ ...input, payload: Buffer.from('{}') })).toBeNull();
    expect(verifyResendWebhook({ ...input, now: new Date('2026-09-12T13:00:00Z') })).toBeNull();
  });
});
