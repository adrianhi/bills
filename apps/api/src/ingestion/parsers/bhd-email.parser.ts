import type { BankEmailParser, NormalizedEmail, NormalizedTransaction, ParseResult, ParserContext } from '../types';
import { normalizeTransactionStatus, transactionStatusLabel } from '../../domain/transaction-status';

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
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeCell(value: string) {
  return htmlToText(value)
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

function normalizedHeader(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function balancedTableBodies(html: string) {
  const tokens = Array.from(html.matchAll(/<\/?table\b[^>]*>/gi));
  const starts: Array<{ contentStart: number }> = [];
  const tables: string[] = [];

  for (const token of tokens) {
    const index = token.index ?? 0;
    if (!/^<\s*\//.test(token[0])) {
      starts.push({ contentStart: index + token[0].length });
      continue;
    }
    const start = starts.pop();
    if (start) tables.push(html.slice(start.contentStart, index));
  }

  // Inner layout tables are shorter than their wrappers. Inspecting them first prevents a
  // containing <td> from swallowing the first header cell of the transaction table.
  return tables.sort((left, right) => left.length - right.length);
}

function extractTransactionTable(html?: string | null) {
  if (!html) return null;
  const required = ['fecha', 'moneda', 'monto', 'comercio', 'estado', 'tipo'];
  for (const table of balancedTableBodies(html)) {
    const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((row) =>
      Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) => decodeCell(cell[1]))
    );
    for (let index = 0; index < rows.length - 1; index += 1) {
      const headers = rows[index].map(normalizedHeader);
      if (!required.every((header) => headers.includes(header))) continue;
      const values = rows.slice(index + 1).find((row) => row.some((value) => value.trim()));
      if (!values) continue;
      return Object.fromEntries(headers.map((header, position) => [header, values[position] ?? ''])) as Record<string, string>;
    }
  }
  return null;
}

function parseNumericAmount(raw: string) {
  let value = raw.replace(/[^\d.,-]/g, '');
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    value = decimal === ',' ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (lastComma >= 0) {
    value = /,\d{1,2}$/.test(value) ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (lastDot >= 0 && !/\.\d{1,2}$/.test(value)) {
    value = value.replace(/\./g, '');
  }
  return Number(value);
}

function extractAmount(content: string) {
  const match = content.match(
    /(?:Monto|Valor|Importe|RD\s*\$|DOP|US\s*\$|USD)\s*:?[\s$]*(?:RD\s*\$|DOP|US\s*\$|USD)?\s*([\d.,]+)/i
  );
  if (!match) return null;
  const amount = parseNumericAmount(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const context = match[0].toUpperCase();
  return { amount, currency: /US\s*\$|USD/.test(context) ? 'USD' : 'DOP' };
}

function extractField(content: string, labels: string[]) {
  const labelPattern = labels.join('|');
  const match = content.match(
    new RegExp(`(?:${labelPattern})\\s*:?\\s*(.{2,100}?)(?=\\s+(?:Monto|Valor|Moneda|Fecha|Hora|Estado|Producto|Cuenta|Tarjeta|Comercio|Beneficiario|Ordenante|N[uú]mero(?:\\s+de\\s+Confirmaci[oó]n)?|Confirmaci[oó]n)\\s*:|$)`, 'i')
  );
  return match?.[1]?.trim() || null;
}

function parseBhdDate(content: string, fallback: Date) {
  const match = content.match(
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s*(?:(?:-|\||,)\s*)?(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i
  );
  if (!match) return fallback;
  let hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const period = match[6]?.toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hour + 4, minute));
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(-180) || 'unknown';
}

export class BhdEmailParser implements BankEmailParser {
  public readonly institutionCode = 'BHD';
  public readonly version = '1.4.0';

  public canParse(email: NormalizedEmail) {
    const sender = email.from.toLowerCase();
    const forwardedHeaders = `${email.text || ''} ${htmlToText(email.html || '')}`.toLowerCase();
    return (
      sender.includes('@bhd.com.do') ||
      sender.includes('alertas@bhd.com.do') ||
      /(?:from|de)\s*:\s*[^\n<]{0,100}(?:<)?[^\s<>]+@bhd\.com\.do(?:>)?/i.test(forwardedHeaders)
    );
  }

  public async parse(email: NormalizedEmail, context?: ParserContext): Promise<ParseResult> {
    const content = `${email.subject} ${email.text || ''} ${htmlToText(email.html || '')}`
      .replace(/\s+/g, ' ')
      .trim();
    const table = extractTransactionTable(email.html);

    if (/promoci[oó]n|conoce nuestras ofertas|EVA/i.test(content) && !/Monto\s*:|transacci[oó]n|transferencia/i.test(content)) {
      return { status: 'ignored', reason: 'PROMOTIONAL_EMAIL' };
    }
    if (/estado\s+de\s+cuenta|resumen\s+de\s+cuenta/i.test(email.subject)) {
      return { status: 'ignored', reason: 'ACCOUNT_STATEMENT' };
    }
    const hasExplicitAmount = Boolean(table) || /\b(?:Monto|Valor|Importe)\s*:?\s*(?:RD\s*\$|DOP|US\s*\$|USD)?\s*\d/i.test(content);
    if (/promoci[oó]n|oferta|conoce\s+(?:m[aá]s|nuestras)/i.test(content) && !hasExplicitAmount) {
      return { status: 'ignored', reason: 'PROMOTIONAL_EMAIL' };
    }
    if (/en proceso/i.test(email.subject)) return { status: 'ignored', reason: 'PENDING_NOTIFICATION' };

    const tableAmount = table?.monto ? parseNumericAmount(table.monto) : NaN;
    const tableCurrency = (table?.moneda || '').toUpperCase();
    const amountValue = Number.isFinite(tableAmount) && tableAmount > 0
      ? { amount: tableAmount, currency: /US|USD/.test(tableCurrency) ? 'USD' : 'DOP' }
      : extractAmount(content);
    if (!amountValue) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };

    const received = /Has recibido una transferencia|Ordenante\s*:/i.test(content);
    const service = /Pago de Servicio|pago de impuesto/i.test(content);
    const transfer = /transferencia|ACH|LBTR|Producto destino/i.test(content);
    const officialTransfer = /confirmaci[oó]n|comprobante|beneficiario\s*:|Producto destino/i.test(content);

    if (transfer && !received && !officialTransfer && /alerta de d[eé]bito|Notificaci[oó]n de Transacciones/i.test(content)) {
      return { status: 'ignored', reason: 'REDUNDANT_TRANSFER_ALERT' };
    }

    let transactionType = 'Compra';
    let category: string | null = null;
    let source = 'BHD_EMAIL';
    const statusCode = normalizeTransactionStatus(table?.estado || content);
    let rawMerchant = table
      ? table.comercio?.trim() || 'Comercio BHD'
      : extractField(content, ['Comercio', 'Establecimiento', 'Descripci[oó]n']) || 'Comercio BHD';

    if (/^(?:Monto|Valor|Producto|Cuenta|RD\$|DOP|US\$)\b/i.test(rawMerchant)) {
      rawMerchant = 'Comercio BHD';
    }

    let notes: string | null = null;
    let prefix = 'bhd_purchase';

    if (received) {
      transactionType = 'Transferencia Recibida';
      category = 'Ingresos / Transferencias';
      source = 'BHD_TRANSFER_INCOME';
      rawMerchant = extractField(content, ['Ordenante', 'Remitente']) || 'Transferencia Recibida';
      notes = rawMerchant;
      prefix = 'bhd_received';
    } else if (service) {
      transactionType = 'Pago de Servicio';
      category = 'Servicios';
      source = 'BHD_SERVICE_PAYMENT';
      rawMerchant = extractField(content, ['Servicio', 'Empresa', 'Beneficiario']) || 'Pago de Servicio';
      prefix = 'bhd_service';
    } else if (transfer) {
      transactionType = 'Transferencia Enviada';
      category = 'Transferencias';
      source = 'BHD_TRANSFER_EMAIL';
      const destMatch = content.match(/Producto destino\s*:\s*([A-Za-z0-9X]+)/i);
      const destAccount = destMatch ? destMatch[1].replace(/.*?([0-9]{4})$/, '•••• $1') : '';
      rawMerchant = extractField(content, ['Beneficiario', 'Destinatario'])
        || (destAccount ? `Transferencia (${destAccount})` : 'Transferencia Bancaria');
      notes = rawMerchant;
      prefix = 'bhd_transfer';
    }

    if (rawMerchant === 'Comercio BHD' && transactionType === 'Compra' && statusCode !== 'REVERSED') {
      return { status: 'unsupported', reason: 'MERCHANT_NOT_FOUND' };
    }

    if (statusCode === 'REVERSED' && rawMerchant === 'Comercio BHD') rawMerchant = 'Reversa BHD';

    const confirmation = content.match(
      /(?:N[uú]mero\s+de\s+Confirmaci[oó]n|Confirmaci[oó]n|Referencia)\s*:\s*([A-Z0-9-]{5,})/i
    )?.[1];
    const cardMatch = content.match(/(?:terminada en|tarjeta|producto)\D{0,30}(\d{4})\b/i);
    const transaction: NormalizedTransaction = {
      externalId: `${prefix}_${safeId(confirmation || email.messageId || email.id)}`,
      cardLast4: cardMatch?.[1] || null,
      cardType: extractField(content, ['Tipo de Tarjeta', 'Producto']),
      rawMerchant,
      category,
      amount: amountValue.amount,
      currency: amountValue.currency,
      status: transactionStatusLabel(statusCode),
      statusCode,
      bankReference: confirmation || null,
      transactionType: table?.tipo?.trim() || transactionType,
      transactionDate: parseBhdDate(table?.fecha || content, email.receivedAt),
      source,
      institutionCode: this.institutionCode,
      ingestionChannel: context?.ingestionChannel || 'GMAIL_OAUTH',
      notes,
    };
    return { status: 'parsed', transactions: [transaction] };
  }
}
