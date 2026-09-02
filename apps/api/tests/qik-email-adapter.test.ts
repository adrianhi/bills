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

  it('normalizes a purchase with Localidad and masked card format', async () => {
    const result = await parser.parse(
      email({
        subject: 'Usaste tu tarjeta de débito Qik',
        text: '¡Hola ADRIAN JOEL HIDALGO BELTRE! Tarjeta Débito 49************3097 Se hizo una transacción de RD$ 1,840.00 en SM BRAVO LAS AMERICAS con tu Tarjeta de Débito Qik que termina en 49************3097 Localidad: SM BRAVO LAS AMERICAS Fecha y hora: 08-11-2026 08:01 PM (AST) Monto: RD$ 1,840.00 Balance Disponible: RD$ 3,310.13',
      }),
      { ingestionChannel: 'GMAIL_OAUTH' }
    );
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      institutionCode: 'QIK',
      rawMerchant: 'SM BRAVO LAS AMERICAS',
      amount: 1840,
      currency: 'DOP',
      cardLast4: '3097',
      status: 'Aprobada',
      transactionType: 'Compra',
    });
  });

  it('does not claim messages from unrelated institutions', () => {
    expect(parser.canParse(email({ from: 'alertas@bhd.com.do', text: 'Monto: RD$ 100' }))).toBe(false);
  });
});
