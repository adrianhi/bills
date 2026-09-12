import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config';
import { EmailTransportError, EmailTransportService } from '../src/modules/proactivity/infrastructure/email-transport.service';

const message = {
  recipient: 'member@example.com', subject: 'Tu Pulso Semanal', html: '<p>Hola</p>', text: 'Hola',
  idempotencyKey: 'cuadre/delivery-id',
};

const original = {
  mode: config.emailDeliveryMode,
  apiKey: config.resendApiKey,
  from: config.emailFrom,
};

afterEach(() => {
  config.emailDeliveryMode = original.mode;
  config.resendApiKey = original.apiKey;
  config.emailFrom = original.from;
  vi.unstubAllGlobals();
});

describe('EmailTransportService', () => {
  it('keeps audit mode provider-free', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    config.emailDeliveryMode = 'AUDIT';
    const result = await new EmailTransportService().sendEmail(message);
    expect(result.mode).toBe('AUDIT_LOG');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, false], [429, true], [503, true],
  ])('does not report Resend HTTP %s as accepted', async (status, retryable) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status })));
    config.emailDeliveryMode = 'LIVE'; config.resendApiKey = 're_test'; config.emailFrom = 'Cuadre <mail@example.com>';
    await expect(new EmailTransportService().sendEmail(message)).rejects.toMatchObject({
      code: `RESEND_HTTP_${status}`, retryable, ambiguous: false,
    } satisfies Partial<EmailTransportError>);
  });

  it('treats a malformed successful response as ambiguous', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    config.emailDeliveryMode = 'LIVE'; config.resendApiKey = 're_test'; config.emailFrom = 'Cuadre <mail@example.com>';
    await expect(new EmailTransportService().sendEmail(message)).rejects.toMatchObject({
      code: 'RESEND_RESPONSE_INVALID', retryable: true, ambiguous: true,
    } satisfies Partial<EmailTransportError>);
  });

  it('passes the stable delivery idempotency key to Resend', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"email_123"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    config.emailDeliveryMode = 'LIVE'; config.resendApiKey = 're_test'; config.emailFrom = 'Cuadre <mail@example.com>';
    await expect(new EmailTransportService().sendEmail(message)).resolves.toMatchObject({ providerMessageId: 'email_123' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'cuadre/delivery-id' }),
    }));
  });
});
