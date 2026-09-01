import { describe, expect, it } from 'vitest';
import { ParserRegistry } from '../src/ingestion/parser-registry';
import { PopularEmailParser } from '../src/ingestion/parsers/popular-email.parser';
import type { NormalizedEmail } from '../src/ingestion/types';

function email(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: 'gmail-popular-001', messageId: '<popular-001@gmail.test>',
    from: 'Banco Popular <notificaciones@popularenlinea.com>', to: ['cliente@example.com'],
    subject: 'Notificación de transacción', text: null, html: null, headers: null,
    receivedAt: new Date('2026-08-29T12:00:00.000Z'), ...overrides,
  };
}

const layout = (body: string) => `<table><tr><td><p>Popular</p>${body}</td></tr></table>`;

describe('Popular email ingestion adapter', () => {
  const parser = new PopularEmailParser();

  it('is registered and accepts only the exact Popular sender', () => {
    expect(ParserRegistry.detect(email())?.institutionCode).toBe('POPULAR');
    expect(ParserRegistry.supportedInstitutionCodes()).toContain('POPULAR');
    expect(parser.canParse(email({ from: 'notificaciones@popularenlinea.com.attacker.test' }))).toBe(false);
    expect(parser.canParse(email({ from: 'attacker@example.com', text: 'notificaciones@popularenlinea.com' }))).toBe(false);
  });

  it('normalizes a card purchase from a nested transaction table', async () => {
    const result = await parser.parse(email({ html: layout(`
      <p>Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 6234.</p>
      <table><tr><th>Monto</th><th>Moneda</th><th>Fecha</th><th>Comercio</th><th>Estatus</th></tr>
      <tr><td>RD$299.52</td><td>Peso dominicano</td><td>29/08/2026</td><td>UBER*RIDES</td><td>Aprobada</td></tr></table>
    `) }));
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      externalId: 'popular_purchase_popular-001gmailtest', institutionCode: 'POPULAR',
      cardLast4: '6234', cardType: 'Visa Débito Clásica', rawMerchant: 'UBER*RIDES',
      amount: 299.52, currency: 'DOP', statusCode: 'APPROVED', transactionType: 'Compra',
      source: 'POPULAR_CARD_PURCHASE',
    });
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-08-29T04:00:00.000Z');
  });

  it('normalizes an ATM withdrawal from text content', async () => {
    const result = await parser.parse(email({
      text: 'Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 6234. Monto Moneda Fecha Cajero Automático Estatus RD$200.00 Peso dominicano 22/08/2026 BANCO POPULAR SIRENA MARG Aprobada En caso de requerir información.',
    }));
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      cardLast4: '6234', rawMerchant: 'BANCO POPULAR SIRENA MARG', amount: 200,
      category: 'Servicios Financieros', transactionType: 'Retiro', source: 'POPULAR_ATM_WITHDRAWAL',
    });
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-08-22T04:00:00.000Z');
  });

  it('stores a received transfer as hidden income data', async () => {
    const result = await parser.parse(email({
      messageId: '<popular-income-001@gmail.test>', subject: 'Transferencia recibida',
      html: layout(`<p>Detalles de la transacción de transferencia recibida en su cuenta terminada en 2048:</p>
        <table><tr><th>Monto</th><th>Fecha</th><th>Canal</th></tr>
        <tr><td>RD 1,500.00</td><td>16/8/2026</td><td>APP POPULAR</td></tr></table>`),
    }));
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      externalId: 'popular_received_popular-income-001gmailtest', cardLast4: '2048',
      category: 'Ingresos / Transferencias', amount: 1500, transactionType: 'Transferencia Recibida',
      source: 'POPULAR_TRANSFER_INCOME', notes: 'Canal: APP POPULAR',
    });
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-08-16T04:00:00.000Z');
  });

  it('ignores promotions and reports incomplete recognized templates', async () => {
    await expect(parser.parse(email({ subject: 'Beneficios Popular', text: 'Conoce esta promoción y oferta.' })))
      .resolves.toEqual({ status: 'ignored', reason: 'NON_TRANSACTIONAL_EMAIL' });
    await expect(parser.parse(email({ text: 'Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 6234.' })))
      .resolves.toEqual({ status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' });
  });
});
