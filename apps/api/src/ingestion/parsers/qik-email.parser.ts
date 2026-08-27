import type {
  BankEmailParser,
  NormalizedEmail,
  NormalizedTransaction,
  ParseResult,
  ParserContext,
} from '../types';
import { normalizeTransactionStatus, transactionStatusLabel } from '../../domain/transaction-status';

function toText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function amountFrom(content: string) {
  const match = content.match(
    /(?:monto|importe|consumo|compra)\s*:?\s*(RD\$|DOP|US\$|USD)?\s*([\d.,]+)/i
  );
  if (!match) return null;
  const currency = /US\$|USD/i.test(match[1] || '') ? 'USD' : 'DOP';
  let numeric = match[2].replace(/[^\d.,]/g, '');
  const comma = numeric.lastIndexOf(',');
  const dot = numeric.lastIndexOf('.');
  if (comma > dot) numeric = numeric.replace(/\./g, '').replace(',', '.');
  else numeric = numeric.replace(/,/g, '');
  const amount = Number(numeric);
  return Number.isFinite(amount) && amount > 0 ? { amount, currency } : null;
}

function field(content: string, labels: string[]) {
  const match = content.match(
    new RegExp(
      `(?:${labels.join('|')})\\s*:?\\s*(.{2,100}?)(?=\\s+(?:Monto|Importe|Fecha|Hora|Estado|Tarjeta|Comercio|Beneficiario|Remitente|Referencia)\\s*:|$)`,
      'i'
    )
  );
  return match?.[1]?.trim() || null;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(-180) || 'unknown';
}

export class QikEmailParser implements BankEmailParser {
  public readonly institutionCode = 'QIK';
  public readonly version = '0.1.0-beta';

  public canParse(email: NormalizedEmail) {
    const source = `${email.from} ${email.text || ''} ${toText(email.html || '')}`.toLowerCase();
    return /@(?:[\w-]+\.)*qik(?:\.com)?\.do\b/.test(source);
  }

  public async parse(email: NormalizedEmail, context?: ParserContext): Promise<ParseResult> {
    const content = `${email.subject} ${email.text || ''} ${toText(email.html || '')}`
      .replace(/\s+/g, ' ')
      .trim();

    if (/promoci[oó]n|oferta|novedades/i.test(content) && !/monto|importe|compra|transferencia/i.test(content)) {
      return { status: 'ignored', reason: 'PROMOTIONAL_EMAIL' };
    }

    const amount = amountFrom(content);
    if (!amount) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };

    const received = /transferencia recibida|recibiste|remitente/i.test(content);
    const sent = /transferencia enviada|enviaste|beneficiario/i.test(content);
    const transactionType = received
      ? 'Transferencia Recibida'
      : sent
        ? 'Transferencia Enviada'
        : 'Compra';
    const merchant = received
      ? field(content, ['Remitente', 'Ordenante']) || 'Transferencia recibida'
      : sent
        ? field(content, ['Beneficiario', 'Destinatario']) || 'Transferencia enviada'
        : field(content, ['Comercio', 'Establecimiento', 'Descripci[oó]n']);

    if (!merchant) return { status: 'unsupported', reason: 'MERCHANT_NOT_FOUND' };

    const reference = content.match(/(?:Referencia|Confirmaci[oó]n)\s*:\s*([A-Z0-9-]{5,})/i)?.[1];
    const cardLast4 = content.match(/(?:tarjeta|terminada en)\D{0,24}(\d{4})\b/i)?.[1] || null;
    const statusCode = normalizeTransactionStatus(content);
    const transaction: NormalizedTransaction = {
      externalId: `qik_${safeId(reference || email.messageId || email.id)}`,
      cardLast4,
      rawMerchant: merchant,
      category: received ? 'Ingresos / Transferencias' : sent ? 'Transferencias' : null,
      amount: amount.amount,
      currency: amount.currency,
      status: transactionStatusLabel(statusCode),
      statusCode,
      transactionType,
      transactionDate: email.receivedAt,
      source: received ? 'QIK_TRANSFER_INCOME' : sent ? 'QIK_TRANSFER_EMAIL' : 'QIK_EMAIL',
      institutionCode: this.institutionCode,
      ingestionChannel: context?.ingestionChannel || 'EMAIL_FORWARD',
      notes: received || sent ? merchant : null,
    };
    return { status: 'parsed', transactions: [transaction] };
  }
}
