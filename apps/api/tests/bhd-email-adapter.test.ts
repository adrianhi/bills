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
      ingestionChannel: 'GMAIL_OAUTH',
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

  it('parses the current BHD transaction table layout', async () => {
    const result = await parser.parse(
      email({
        subject: 'BHD Notificación de Transacciones',
        html: `
          <p>Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 0380</p>
          <table>
            <tr><th>Fecha</th><th>Moneda</th><th>Monto</th><th>Comercio</th><th>Estado</th><th>Tipo</th></tr>
            <tr><td>25/08/2026 07:19 pm</td><td>RD</td><td>$85.00</td><td>COMERCIO DEMO</td><td>Aprobada</td><td>Compra</td></tr>
          </table>
        `,
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 85,
      currency: 'DOP',
      rawMerchant: 'COMERCIO DEMO',
      cardLast4: '0380',
      statusCode: 'APPROVED',
      status: 'Aprobada',
    });
    expect(result.transactions[0].transactionDate.toISOString()).toBe('2026-08-25T23:19:00.000Z');
  });

  it('parses the current BHD table when it is nested in an email layout table', async () => {
    const result = await parser.parse(
      email({
        subject: 'BHD Notificación de Transacciones',
        html: `
          <table><tr><td><p>Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 1111</p>
            <table>
              <thead><tr><td>Fecha</td><td>Moneda</td><td>Monto</td><td>Comercio</td><td>Estado</td><td>Tipo</td></tr></thead>
              <tbody><tr><td>26/08/2026 08:15 am</td><td>RD</td><td>$42.50</td><td>COMERCIO ANONIMIZADO</td><td>Aprobada</td><td>Compra</td></tr></tbody>
            </table>
          </td></tr></table>
        `,
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 42.5,
      currency: 'DOP',
      rawMerchant: 'COMERCIO ANONIMIZADO',
      cardLast4: '1111',
      statusCode: 'APPROVED',
    });
  });

  it('parses the BHD label/value layout with a spaced RD currency symbol', async () => {
    const result = await parser.parse(
      email({
        subject: 'Aviso de transaccion BHD',
        html: `
          <p>Transacción realizada con Tarjeta de Débito terminada en 1111.</p>
          <table><tbody>
            <tr><td>Comercio</td><td>:</td><td></td><td>COMERCIO ANONIMIZADO</td></tr>
            <tr><td>Monto</td><td>:</td><td></td><td>RD $ 1,234.56</td></tr>
            <tr><td>Fecha y hora</td><td>:</td><td></td><td>26/08/2026 08:15 AM</td></tr>
          </tbody></table>
        `,
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 1234.56,
      currency: 'DOP',
      rawMerchant: 'COMERCIO ANONIMIZADO',
      cardLast4: '1111',
      statusCode: 'APPROVED',
    });
  });

  it('ignores account statements and marketing without a transaction amount', async () => {
    const statement = await parser.parse(email({
      subject: 'Tu estado de cuenta está disponible',
      html: '<p>Consulta el resumen de tu cuenta.</p>',
    }));
    const marketing = await parser.parse(email({
      subject: 'Beneficios BHD',
      html: '<p>Conoce más sobre esta oferta para tus tarjetas.</p>',
    }));

    expect(statement).toEqual({ status: 'ignored', reason: 'ACCOUNT_STATEMENT' });
    expect(marketing).toEqual({ status: 'ignored', reason: 'PROMOTIONAL_EMAIL' });
  });

  it('parses a merchant-less reversal from the current BHD table layout', async () => {
    const result = await parser.parse(
      email({
        id: 'email_reversal',
        messageId: '<reversal@bhd.com.do>',
        subject: 'BHD Notificación de Transacciones',
        html: `
          <p>Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 0380</p>
          <table>
            <tr><th>Fecha</th><th>Moneda</th><th>Monto</th><th>Comercio</th><th>Estado</th><th>Tipo</th></tr>
            <tr><td>26/08/2026 07:34 am</td><td>RD</td><td>$313.34</td><td></td><td>Reversada</td><td>Compra</td></tr>
          </table>
          <p>Conoce más ofertas y beneficios BHD.</p>
        `,
      })
    );

    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.transactions[0]).toMatchObject({
      amount: 313.34,
      rawMerchant: 'Reversa BHD',
      cardLast4: '0380',
      statusCode: 'REVERSED',
      status: 'Reversada',
    });
  });
});
