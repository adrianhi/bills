import { describe, expect, it } from 'vitest';
import { ParserRegistry } from '../src/ingestion/parser-registry';
import { BanreservasEmailParser } from '../src/ingestion/parsers/banreservas-email.parser';
import type { NormalizedEmail } from '../src/ingestion/types';

function email(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: 'gmail-banreservas-001',
    messageId: '<banreservas-001@gmail.test>',
    from: 'Notificaciones Banreservas <notificaciones@banreservas.com>',
    to: ['cliente@example.com'],
    subject: 'Notificaciones Banreservas',
    text: null,
    html: null,
    headers: null,
    receivedAt: new Date('2026-07-30T13:16:00.000Z'),
    ...overrides,
  };
}

describe('Banreservas email ingestion adapter', () => {
  const parser = new BanreservasEmailParser();

  it('is discoverable only through the two supported senders', () => {
    expect(ParserRegistry.detect(email())?.institutionCode).toBe('BANRESERVAS');
    expect(ParserRegistry.supportedInstitutionCodes()).toContain('BANRESERVAS');
    expect(parser.canParse(email({ from: 'promociones@banreservas.com' }))).toBe(false);
    expect(parser.canParse(email({ from: 'attacker@example.com' }))).toBe(false);
  });

  it('normalizes a card consumption notification', async () => {
    const result = await parser.parse(email({
      html: `
        <h1>Notificación de Consumo</h1>
        <p>Su tarjeta ESTANDAR ••1982 presenta un consumo.</p>
        <p>Monto: <strong>DOP 3,850.00</strong></p>
        <p>Estado: <strong>APROBADO</strong></p>
        <p>Comercio: <strong>COMERCIO DE PRUEBA</strong></p>
        <p>Fecha de transacción: <strong>30/07/2026 09:15 AM</strong></p>
        <p>Número de aprobación: <strong>068383</strong></p>
      `,
    }), { ingestionChannel: 'GMAIL_OAUTH' });

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      institutionCode: 'BANRESERVAS',
      externalId: 'banreservas_purchase_068383',
      cardLast4: '1982',
      cardType: 'ESTANDAR',
      rawMerchant: 'COMERCIO DE PRUEBA',
      amount: 3850,
      currency: 'DOP',
      statusCode: 'APPROVED',
      transactionType: 'Compra',
      source: 'BANRESERVAS_CARD_PURCHASE',
    });
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-07-30T13:15:00.000Z');
  });

  it('normalizes a sent third-party transfer without adding taxes to the amount', async () => {
    const result = await parser.parse(email({
      from: 'NotificacionesTuBancoApp@banreservas.com',
      subject: 'Recibo de la transacción',
      text: [
        '¡Transacción realizada!',
        'Monto: DOP 5,000.00',
        'Transacción: Transferencia a Tercero',
        'Origen: PERSONA DE PRUEBA, Cuenta de ahorro DOP ** - 8893',
        'Destino: BENEFICIARIO DE PRUEBA, Cuenta de ahorro DOP ** - 2695',
        'Fecha de transacción: 23 de Julio 2026 - 06:34 PM',
        'Impuestos: DOP 10.00',
        'Número de transacción: 242536619359',
      ].join(' '),
    }), { ingestionChannel: 'GMAIL_OAUTH' });

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      externalId: 'banreservas_transfer_242536619359',
      cardLast4: '8893',
      rawMerchant: 'BENEFICIARIO DE PRUEBA',
      amount: 5000,
      currency: 'DOP',
      category: 'Transferencias',
      transactionType: 'Transferencia Enviada',
      source: 'BANRESERVAS_TRANSFER_SENT',
    });
    expect(result.transactions[0].notes).toContain('Impuestos: DOP 10.00');
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-07-23T22:34:00.000Z');
  });

  it('ignores unsupported Banreservas templates and rejects incomplete known templates', async () => {
    await expect(parser.parse(email({ subject: 'Beneficios Banreservas', text: 'Conoce nuestras ofertas.' })))
      .resolves.toEqual({ status: 'ignored', reason: 'NON_TRANSACTIONAL_EMAIL' });
    await expect(parser.parse(email({ text: 'Notificación de Consumo Monto: DOP 100.00 Estado: APROBADO' })))
      .resolves.toEqual({ status: 'unsupported', reason: 'TRANSACTION_DATE_NOT_FOUND' });
  });
});
