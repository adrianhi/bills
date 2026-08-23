import { describe, expect, it } from 'vitest';
import { BhdEmailParser } from '../src/ingestion/parsers/bhd-email.parser';
import type { NormalizedEmail } from '../src/ingestion/types';

function email(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: 'email_01',
    messageId: '<message-01@bhd.com.do>',
    from: 'Notificaciones BHD <alertas@bhd.com.do>',
    to: ['bhd-user@inbound.example.com'],
    subject: 'Notificación de transacción',
    text: null,
    html: null,
    headers: null,
    receivedAt: new Date('2026-08-19T17:42:00.000Z'),
    ...overrides,
  };
}

describe('BHD email ingestion adapter', () => {
  const parser = new BhdEmailParser();

  it('accepts only BHD senders', () => {
    expect(parser.canParse(email())).toBe(true);
    expect(parser.canParse(email({ from: 'attacker@example.com' }))).toBe(false);
    expect(
      parser.canParse(
        email({
          from: 'Usuario <user@example.com>',
          text: '---------- Forwarded message ---------\nFrom: Banco BHD <alertas@bhd.com.do>',
        })
      )
    ).toBe(true);
  });

  it('normalizes a confirmed transfer and preserves the institution boundary', async () => {
    const result = await parser.parse(
      email({
        subject: 'Confirmación de transferencia',
        html: `
          <p>Monto: <strong>RD$ 2,500.00</strong></p>
          <p>Beneficiario: <strong>COLEGIO LOYOLA</strong></p>
          <p>Número de confirmación: <strong>M10-1787-1613-5982-7</strong></p>
          <p>Fecha y hora de la transacción: <strong>19/08/2026 - 1:42 PM</strong></p>
        `,
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 2500,
      currency: 'DOP',
      rawMerchant: 'COLEGIO LOYOLA',
      transactionType: 'Transferencia Enviada',
      institutionCode: 'BHD',
      ingestionChannel: 'EMAIL_FORWARD',
    });
    expect(result.transactions[0].externalId).toContain('M10-1787-1613-5982-7');
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-08-19T17:42:00.000Z');
  });

  it('ignores an interim transfer notification instead of creating a duplicate', async () => {
    const result = await parser.parse(
      email({
        subject: 'Notificación Pagos al Instante en Proceso',
        text: 'Monto: RD$ 1,500.00 Beneficiario: Persona Ejemplo',
      })
    );

    expect(result).toEqual({ status: 'ignored', reason: 'PENDING_NOTIFICATION' });
  });

  it('normalizes received transfers as income', async () => {
    const result = await parser.parse(
      email({
        subject: 'Has recibido una transferencia',
        text:
          'Has recibido una transferencia. Ordenante: LUIS RAFAEL NUNEZ Monto: RD$200.00 Fecha: 19/08/2026 01:26 PM',
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 200,
      rawMerchant: 'LUIS RAFAEL NUNEZ',
      category: 'Ingresos / Transferencias',
      source: 'BHD_TRANSFER_INCOME',
    });
  });
});
