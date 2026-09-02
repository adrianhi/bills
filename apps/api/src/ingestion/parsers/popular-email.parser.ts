import { normalizeTransactionStatus, transactionStatusLabel } from '../../domain/transaction-status';
import type { BankEmailParser, NormalizedEmail, NormalizedTransaction, ParseResult, ParserContext } from '../types';

const POPULAR_SENDER = 'notificaciones@popularenlinea.com';

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

function senderAddress(value: string) {
  return (value.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] || value.match(/[\w.+-]+@[\w.-]+/)?.[0] || '')
    .trim()
    .toLowerCase();
}

function normalizedHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function balancedTableBodies(html: string) {
  const tokens = Array.from(html.matchAll(/<\/?table\b[^>]*>/gi));
  const starts: number[] = [];
  const tables: string[] = [];
  for (const token of tokens) {
    const index = token.index ?? 0;
    if (!/^<\s*\//.test(token[0])) starts.push(index + token[0].length);
    else {
      const start = starts.pop();
      if (start !== undefined) tables.push(html.slice(start, index));
    }
  }
  return tables.sort((left, right) => left.length - right.length);
}

function transactionTable(html?: string | null): Record<string, string> | null {
  if (!html) return null;
  for (const table of balancedTableBodies(html)) {
    const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((row) =>
      Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) => htmlToText(cell[1]))
    );
    for (let index = 0; index < rows.length - 1; index += 1) {
      const headers = rows[index].map(normalizedHeader);
      if (!headers.includes('monto') || !headers.includes('fecha')) continue;
      const values = rows.slice(index + 1).find((row) => row.some(Boolean));
      if (!values) continue;
      return Object.fromEntries(headers.map((header, position) => [header, values[position] || '']));
    }
  }
  return null;
}

function parseAmount(value: string) {
  let numeric = value.replace(/[^\d.,-]/g, '');
  const comma = numeric.lastIndexOf(',');
  const dot = numeric.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    numeric = comma > dot ? numeric.replace(/\./g, '').replace(',', '.') : numeric.replace(/,/g, '');
  } else if (comma >= 0) {
    numeric = /,\d{1,2}$/.test(numeric) ? numeric.replace(/\./g, '').replace(',', '.') : numeric.replace(/,/g, '');
  } else if (dot >= 0 && !/\.\d{1,2}$/.test(numeric)) numeric = numeric.replace(/\./g, '');
  const amount = Number(numeric);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function santoDomingoDate(value: string) {
  const match = value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 4));
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(-180) || 'unknown';
}

function textTable(content: string): Record<string, string> | null {
  const card = content.match(
    /Monto\s+Moneda\s+Fecha\s+(Comercio|Cajero\s+Autom[aá]tico)\s+Estatus\s+((?:RD|US)\s*\$?\s*[\d.,]+)\s+(Peso\s+dominicano|DOP|USD|D[oó]lar(?:es)?(?:\s+estadounidense)?)\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s+(.+?)\s+(Aprobada|Rechazada|Pendiente|Reversada)(?:\s|$)/i
  );
  if (card) return {
    monto: card[2], moneda: card[3], fecha: card[4],
    [normalizedHeader(card[1])]: card[5].trim(), estatus: card[6],
  };
  const received = content.match(
    /Monto\s+Fecha\s+Canal\s+((?:RD|US)\s*\$?\s*[\d.,]+)\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s+(.+?)(?=\s+(?:Si necesita|En caso de|Estamos comprometidos|Atentamente)|$)/i
  );
  return received ? { monto: received[1], fecha: received[2], canal: received[3].trim() } : null;
}

export class PopularEmailParser implements BankEmailParser {
  public readonly institutionCode = 'POPULAR';
  public readonly version = '1.0.0';

  public canParse(email: NormalizedEmail) {
    return senderAddress(email.from) === POPULAR_SENDER;
  }

  public async parse(email: NormalizedEmail, context?: ParserContext): Promise<ParseResult> {
    if (!this.canParse(email)) return { status: 'ignored', reason: 'UNSUPPORTED_SENDER' };
    const content = `${email.subject} ${email.text || ''} ${htmlToText(email.html || '')}`.replace(/\s+/g, ' ').trim();
    const table = transactionTable(email.html) || textTable(content);
    const received = /transferencia\s+recibida|cuenta\s+terminada\s+en/i.test(content);
    const withdrawal = Boolean(table?.['cajero automatico']) || /Cajero\s+Autom[aá]tico/i.test(content);
    const purchase = Boolean(table?.comercio) || /Tarjeta\s+Visa|Gracias por utilizar su Tarjeta/i.test(content);

    if (/promoci[oó]n|oferta|beneficio/i.test(content) && !table) return { status: 'ignored', reason: 'NON_TRANSACTIONAL_EMAIL' };
    if (!received && !withdrawal && !purchase) return { status: 'ignored', reason: 'POPULAR_TEMPLATE_NOT_SUPPORTED' };
    if (!table?.monto) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };
    const amount = parseAmount(table.monto);
    if (!amount) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };
    const transactionDate = santoDomingoDate(table.fecha || content);
    if (!transactionDate) return { status: 'unsupported', reason: 'TRANSACTION_DATE_NOT_FOUND' };

    const messageKey = safeId(email.messageId || email.id);
    const card = content.match(/Tarjeta\s+(.{2,80}?),?\s+terminada\s+en\s+(\d{4})\b/i);
    const account = content.match(/cuenta\s+terminada\s+en\s+(\d{4})\b/i);
    const statusCode = received ? 'APPROVED' : normalizeTransactionStatus(table.estatus || content);
    let transaction: NormalizedTransaction;

    if (received) {
      transaction = {
        externalId: `popular_received_${messageKey}`,
        cardLast4: account?.[1] || null,
        cardType: 'Cuenta Bancaria',
        rawMerchant: 'Transferencia recibida',
        category: 'Ingresos / Transferencias',
        amount,
        currency: /US|USD|d[oó]lar/i.test(`${table.monto} ${table.moneda || ''}`) ? 'USD' : 'DOP',
        status: transactionStatusLabel(statusCode), statusCode,
        transactionType: 'Transferencia Recibida', transactionDate,
        source: 'POPULAR_TRANSFER_INCOME', institutionCode: this.institutionCode,
        ingestionChannel: context?.ingestionChannel || 'GMAIL_OAUTH',
        notes: table.canal ? `Canal: ${table.canal}` : null,
      };
    } else {
      const rawMerchant = (withdrawal ? table['cajero automatico'] : table.comercio)?.trim();
      if (!rawMerchant) return { status: 'unsupported', reason: withdrawal ? 'ATM_NOT_FOUND' : 'MERCHANT_NOT_FOUND' };
      transaction = {
        externalId: `popular_${withdrawal ? 'atm' : 'purchase'}_${messageKey}`,
        cardLast4: card?.[2] || null, cardType: card?.[1]?.trim() || null,
        rawMerchant, category: withdrawal ? 'Servicios Financieros' : null,
        amount,
        currency: /US|USD|d[oó]lar/i.test(`${table.monto} ${table.moneda || ''}`) ? 'USD' : 'DOP',
        status: transactionStatusLabel(statusCode), statusCode,
        transactionType: withdrawal ? 'Retiro' : 'Compra', transactionDate,
        source: withdrawal ? 'POPULAR_ATM_WITHDRAWAL' : 'POPULAR_CARD_PURCHASE',
        institutionCode: this.institutionCode,
        ingestionChannel: context?.ingestionChannel || 'GMAIL_OAUTH',
      };
    }
    return { status: 'parsed', transactions: [transaction] };
  }
}
