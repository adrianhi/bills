import { describe, expect, it } from 'vitest';
import { ParserRegistry } from '../src/ingestion/parser-registry';
import { QikEmailParser } from '../src/ingestion/parsers/qik-email.parser';
import type { NormalizedEmail } from '../src/ingestion/types';

function email(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: 'gmail-qik-001',
    messageId: '<qik-001@mail.qik.do>',
    from: 'Notificaciones Qik <notificaciones@mail.qik.do>',
    to: ['cliente@gmail.com'],
    subject: 'Realizaste una compra con tu tarjeta Qik',
    text: 'Comercio: FARMACIA CAROL Monto: RD$ 1,250.50 Tarjeta terminada en 7788 Referencia: QK123456',
    receivedAt: new Date('2026-08-22T14:30:00.000Z'),
    ...overrides,
  };
}

describe('Qik email adapter contract', () => {
  const parser = new QikEmailParser();

  it('is discoverable through the shared parser registry', () => {
    expect(ParserRegistry.detect(email())?.institutionCode).toBe('QIK');
    expect(ParserRegistry.supportedInstitutionCodes()).toContain('QIK');
  });

  it('normalizes a purchase without changing the shared transaction contract', async () => {
    const result = await parser.parse(email(), { ingestionChannel: 'GMAIL_OAUTH' });
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      institutionCode: 'QIK',
      ingestionChannel: 'GMAIL_OAUTH',
      externalId: 'qik_QK123456',
      rawMerchant: 'FARMACIA CAROL',
      amount: 1250.5,
      currency: 'DOP',
      cardLast4: '7788',
      transactionType: 'Compra',
    });
  });

  it('normalizes received transfers as income', async () => {
    const result = await parser.parse(
      email({
        subject: 'Recibiste una transferencia',
        text: 'Remitente: ANA PEREZ Monto: DOP 5,000.00 Referencia: QK654321',
      }),
      { ingestionChannel: 'GMAIL_OAUTH' }
    );
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      source: 'QIK_TRANSFER_INCOME',
      transactionType: 'Transferencia Recibida',
      category: 'Ingresos / Transferencias',
      rawMerchant: 'ANA PEREZ',
    });
  });

  it('does not claim messages from unrelated institutions', () => {
    expect(parser.canParse(email({ from: 'alertas@bhd.com.do', text: 'Monto: RD$ 100' }))).toBe(false);
  });
});
