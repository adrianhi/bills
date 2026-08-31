import { describe, expect, it } from 'vitest';
import { normalizeGmailMessage } from '../src/modules/connections/infrastructure/google/google-gmail.client';

const encoded = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

describe('Gmail message normalization', () => {
  it('normalizes nested MIME bodies and case-insensitive headers', () => {
    const email = normalizeGmailMessage({
      id: 'gmail-1',
      internalDate: '1788206400000',
      payload: {
        mimeType: 'multipart/alternative',
        headers: [
          { name: 'Message-ID', value: '<bank-1@example.test>' },
          { name: 'From', value: 'Banco <alerts@example.test>' },
          { name: 'To', value: 'one@example.test, two@example.test' },
          { name: 'Subject', value: 'Movimiento aprobado' },
        ],
        parts: [
          { mimeType: 'text/plain', body: { data: encoded('plain body') } },
          { mimeType: 'text/html', body: { data: encoded('<b>html body</b>') } },
        ],
      },
    });

    expect(email).toMatchObject({
      id: 'gmail-1',
      messageId: '<bank-1@example.test>',
      from: 'Banco <alerts@example.test>',
      to: ['one@example.test', 'two@example.test'],
      subject: 'Movimiento aprobado',
      text: 'plain body',
      html: '<b>html body</b>',
    });
    expect(email.receivedAt.toISOString()).toBe('2026-08-31T20:00:00.000Z');
  });

  it('falls back to message id and header date when optional content is absent', () => {
    const email = normalizeGmailMessage({
      id: 'gmail-2',
      payload: { headers: [{ name: 'Date', value: 'Mon, 31 Aug 2026 08:30:00 -0400' }] },
    });
    expect(email.messageId).toBe('gmail-2');
    expect(email.text).toBeNull();
    expect(email.html).toBeNull();
    expect(email.receivedAt.toISOString()).toBe('2026-08-31T12:30:00.000Z');
  });
});
