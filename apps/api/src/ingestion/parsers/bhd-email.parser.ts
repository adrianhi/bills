import type { BankEmailParser, NormalizedEmail, NormalizedTransaction, ParseResult } from '../types';

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
  const match = content.match(/(?:Monto|Valor|Importe|RD\$|DOP|US\$|USD)\s*:?[\s$]*(?:RD\$|DOP|US\$|USD)?\s*([\d.,]+)/i);
  if (!match) return null;
  const amount = parseNumericAmount(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const context = match[0].toUpperCase();
  return { amount, currency: /US\$|USD/.test(context) ? 'USD' : 'DOP' };
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
  public readonly version = '1.0.0';

  public canParse(email: NormalizedEmail) {
    const sender = email.from.toLowerCase();
    const forwardedHeaders = `${email.text || ''} ${htmlToText(email.html || '')}`.toLowerCase();
    return (
      sender.includes('@bhd.com.do') ||
      sender.includes('alertas@bhd.com.do') ||
      /(?:from|de)\s*:\s*[^\n<]{0,100}(?:<)?[^\s<>]+@bhd\.com\.do(?:>)?/i.test(forwardedHeaders)
    );
  }

  public async parse(email: NormalizedEmail): Promise<ParseResult> {
    const content = `${email.subject} ${email.text || ''} ${htmlToText(email.html || '')}`
      .replace(/\s+/g, ' ')
      .trim();

    if (/promoci[oó]n|conoce nuestras ofertas|EVA/i.test(content) && !/Monto\s*:|transacci[oó]n|transferencia/i.test(content)) {
      return { status: 'ignored', reason: 'PROMOTIONAL_EMAIL' };
    }
    if (/en proceso/i.test(email.subject)) return { status: 'ignored', reason: 'PENDING_NOTIFICATION' };

    const amountValue = extractAmount(content);
    if (!amountValue) return { status: 'unsupported', reason: 'AMOUNT_NOT_FOUND' };

    const received = /Has recibido una transferencia|Ordenante\s*:/i.test(content);
    const service = /Pago de Servicio|pago de impuesto/i.test(content);
    const transfer = /transferencia|ACH|LBTR/i.test(content);
    const officialTransfer = /confirmaci[oó]n|comprobante|beneficiario\s*:/i.test(content);

    if (transfer && !received && !officialTransfer && /alerta de d[eé]bito|Notificaci[oó]n de Transacciones/i.test(content)) {
      return { status: 'ignored', reason: 'REDUNDANT_TRANSFER_ALERT' };
    }

    let transactionType = 'Compra';
    let category: string | null = null;
    let source = 'BHD_EMAIL';
    let rawMerchant = extractField(content, ['Comercio', 'Establecimiento', 'Descripci[oó]n']) || 'Comercio BHD';
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
      rawMerchant = extractField(content, ['Beneficiario', 'Destinatario']) || 'Transferencia Bancaria';
      notes = rawMerchant;
      prefix = 'bhd_transfer';
    }

    if (rawMerchant === 'Comercio BHD' && transactionType === 'Compra') {
      return { status: 'unsupported', reason: 'MERCHANT_NOT_FOUND' };
    }

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
      status: /rechazad|declinad|denegad/i.test(content) ? 'Rechazada' : 'Aprobada',
      transactionType,
      transactionDate: parseBhdDate(content, email.receivedAt),
      source,
      institutionCode: this.institutionCode,
      ingestionChannel: 'EMAIL_FORWARD',
      notes,
    };
    return { status: 'parsed', transactions: [transaction] };
  }
}
