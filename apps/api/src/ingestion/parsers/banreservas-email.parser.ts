import { normalizeTransactionStatus, transactionStatusLabel } from '../../domain/transaction-status';
import type { BankEmailParser, NormalizedEmail, NormalizedTransaction, ParseResult, ParserContext } from '../types';

const PURCHASE_SENDER = 'notificaciones@banreservas.com';
const TRANSFER_SENDER = 'notificacionestubancoapp@banreservas.com';
const SUPPORTED_SENDERS = new Set([PURCHASE_SENDER, TRANSFER_SENDER]);

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

function parseNumericAmount(raw: string) {
  let value = raw.replace(/[^\d.,-]/g, '');
  const comma = value.lastIndexOf(',');
  const dot = value.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (comma >= 0) {
    value = /,\d{1,2}$/.test(value) ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (dot >= 0 && !/\.\d{1,2}$/.test(value)) {
    value = value.replace(/\./g, '');
  }
  return Number(value);
}

function extractMoney(content: string, label: string) {
  const match = content.match(new RegExp(`${label}\\s*:?\\s*(DOP|RD\\s*\\$|USD|US\\s*\\$)?\\s*([\\d.,]+)`, 'i'));
  if (!match) return null;
  const amount = parseNumericAmount(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: /USD|US\s*\$/i.test(match[1] || '') ? 'USD' : 'DOP' };
}

function extractField(content: string, label: string, nextLabels: string[]) {
  const next = nextLabels.length ? `(?=\\s+(?:${nextLabels.join('|')})\\s*:|$)` : '$';
  return content.match(new RegExp(`${label}\\s*:?\\s*(.{1,300}?)${next}`, 'i'))?.[1]?.trim() || null;
}

const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

function santoDomingoDate(content: string) {
  const numeric = content.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s*(?:-|\|)?\s*(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  const written = content.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+(\d{4})\s*(?:-|\|)?\s*(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  const match = numeric || written;
  if (!match) return null;
  const month = numeric ? Number(match[2]) - 1 : MONTHS[match[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()];
  if (month === undefined || month < 0 || month > 11) return null;
  let hour = Number(match[4]);
  const period = match[6]?.toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1]), hour + 4, Number(match[5])));
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(-180) || 'unknown';
}

function clippedNotes(parts: Array<string | null>) {
  return parts.filter(Boolean).join(' | ').slice(0, 500) || null;
}

export class BanreservasEmailParser implements BankEmailParser {
  public readonly institutionCode = 'BANRESERVAS';
  public readonly version = '1.0.0';

  public canParse(email: NormalizedEmail) {
    return SUPPORTED_SENDERS.has(senderAddress(email.from));
  }

  public async parse(email: NormalizedEmail, context?: ParserContext): Promise<ParseResult> {
    const sender = senderAddress(email.from);
    if (!SUPPORTED_SENDERS.has(sender)) return { status: 'ignored', reason: 'UNSUPPORTED_SENDER' };

    const content = `${email.subject} ${email.text || ''} ${htmlToText(email.html || '')}`.replace(/\s+/g, ' ').trim();
    if (/promoci[oó]n|oferta|beneficio|estado\s+de\s+cuenta/i.test(content) && !/Monto\s*:/i.test(content)) {
      return { status: 'ignored', reason: 'NON_TRANSACTIONAL_EMAIL' };
    }

    const isPurchase = sender === PURCHASE_SENDER && /Notificaci[oó]n de Consumo|presenta un consumo/i.test(content);
    const isTransfer = sender === TRANSFER_SENDER && /Transacci[oó]n realizada|Transferencia a Tercero/i.test(content);
    if (!isPurchase && !isTransfer) return { status: 'ignored', reason: 'BANRESERVAS_TEMPLATE_NOT_SUPPORTED' };

    const money = extractMoney(content, 'Monto');
    if (!money) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };
    const transactionDate = santoDomingoDate(content);
    if (!transactionDate) return { status: 'unsupported', reason: 'TRANSACTION_DATE_NOT_FOUND' };

    let transaction: NormalizedTransaction;
    if (isPurchase) {
      const merchant = extractField(content, 'Comercio', ['Fecha de transacci[oó]n', 'N[uú]mero de aprobaci[oó]n']);
      if (!merchant) return { status: 'unsupported', reason: 'MERCHANT_NOT_FOUND' };
      const approval = content.match(/N[uú]mero de aprobaci[oó]n\s*:?\s*([A-Z0-9-]{4,})/i)?.[1] || null;
      const card = content.match(/tarjeta\s+(.{1,60}?)\s*[•*Xx-]{1,6}\s*(\d{4})\b/i);
      const statusCode = normalizeTransactionStatus(extractField(content, 'Estado', ['Comercio', 'Fecha de transacci[oó]n']) || content);
      transaction = {
        externalId: `banreservas_purchase_${safeId(approval || email.messageId || email.id)}`,
        cardLast4: card?.[2] || null,
        cardType: card?.[1]?.trim() || null,
        rawMerchant: merchant,
        amount: money.amount,
        currency: money.currency,
        status: transactionStatusLabel(statusCode),
        statusCode,
        bankReference: approval,
        transactionType: 'Compra',
        transactionDate,
        source: 'BANRESERVAS_CARD_PURCHASE',
        institutionCode: this.institutionCode,
        ingestionChannel: context?.ingestionChannel || 'GMAIL_OAUTH',
      };
    } else {
      const type = extractField(content, 'Transacci[oó]n', ['Origen', 'Destino', 'Fecha de transacci[oó]n']);
      const origin = extractField(content, 'Origen', ['Destino', 'Fecha de transacci[oó]n']);
      const destination = extractField(content, 'Destino', ['Fecha de transacci[oó]n', 'Impuestos', 'N[uú]mero de transacci[oó]n']);
      if (!destination) return { status: 'unsupported', reason: 'BENEFICIARY_NOT_FOUND' };
      const beneficiary = destination.split(/,\s*Cuenta\b/i)[0]?.trim();
      if (!beneficiary) return { status: 'unsupported', reason: 'BENEFICIARY_NOT_FOUND' };
      const reference = content.match(/N[uú]mero de transacci[oó]n\s*:?\s*([A-Z0-9-]{5,})/i)?.[1] || null;
      const tax = extractMoney(content, 'Impuestos');
      const originLast4 = origin?.match(/(\d{4})\s*$/)?.[1] || null;
      transaction = {
        externalId: `banreservas_transfer_${safeId(reference || email.messageId || email.id)}`,
        cardLast4: originLast4,
        cardType: origin?.match(/Cuenta de ([^,*]+)/i)?.[1]?.trim() || null,
        rawMerchant: beneficiary,
        category: 'Transferencias',
        amount: money.amount,
        currency: money.currency,
        status: transactionStatusLabel('APPROVED'),
        statusCode: 'APPROVED',
        bankReference: reference,
        transactionType: 'Transferencia Enviada',
        transactionDate,
        source: 'BANRESERVAS_TRANSFER_SENT',
        institutionCode: this.institutionCode,
        ingestionChannel: context?.ingestionChannel || 'GMAIL_OAUTH',
        notes: clippedNotes([
          type ? `Tipo original: ${type}` : null,
          origin ? `Origen: ${origin}` : null,
          `Destino: ${destination}`,
          tax ? `Impuestos: ${tax.currency} ${tax.amount.toFixed(2)}` : null,
        ]),
      };
    }

    return { status: 'parsed', transactions: [transaction] };
  }
}
