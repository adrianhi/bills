/**
 * Banco BHD Email Parser for n8n Code Node
 *
 * Specifically tuned for Banco BHD's "Notificación de Transacciones" email format:
 * Header: Visa Débito Intl # 0380
 * Table: | Fecha | Moneda | Monto | Comercio | Estado | Tipo |
 * Row:   | 18/08/2026 07:14 pm | RD | $1,530.00 | SM BRAVO LAS AMERICAS | Aprobada | Compra |
 */

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBhdDate(dateStr, fallbackTimestamp) {
  if (!dateStr) return fallbackTimestamp ? new Date(parseInt(fallbackTimestamp, 10)).toISOString() : new Date().toISOString();
  const clean = dateStr.trim().replace(/\s+/g, ' ');
  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const meridian = match[7] ? match[7].toUpperCase() : null;
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    const pad = (n) => String(n).padStart(2, '0');
    const iso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}-04:00`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return fallbackTimestamp ? new Date(parseInt(fallbackTimestamp, 10)).toISOString() : new Date().toISOString();
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const clean = String(amountStr).replace(/[^\d.,]/g, '').replace(/,/g, '');
  return parseFloat(clean) || 0;
}

function parseBhdNotification(item) {
  const data = item.json || item;
  
  // Check all possible HTML & Text properties returned by n8n Gmail node
  const rawHtml = data.html || data.textHtml || data.textAsHtml || data.body || '';
  const rawText = data.text || data.textPlain || data.snippet || '';
  const fullContent = rawHtml ? stripHtml(rawHtml) : rawText;
  const externalId = data.messageId || data.id || `bhd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Tarjeta (ej: Visa Débito Intl # 0380)
  let cardLast4 = null;
  let cardType = 'Visa Débito';
  const cardHeaderMatch =
    fullContent.match(/(?:Tarjeta\s+)?([A-Za-zÀ-ÿ\s]+?)\s*#\s*(\d{4})/i) ||
    fullContent.match(/(?:Tarjeta|Producto)[^:]*?[:\-]?\s*([A-Za-zÀ-ÿ\s]+)?(?:\*{2,8}|x{2,8})?\s*(\d{4})/i) ||
    fullContent.match(/(\*{2,8}|x{2,8})\s*(\d{4})/i);

  if (cardHeaderMatch) {
    cardLast4 = cardHeaderMatch[2] || cardHeaderMatch[1] || null;
    if (cardHeaderMatch[1] && isNaN(cardHeaderMatch[1])) {
      cardType = cardHeaderMatch[1].replace(/^(Te notificamos la transacción realizada con tu|Tu)/i, '').trim();
    }
  }

  let transactionDate = new Date().toISOString();
  let currency = 'DOP';
  let amount = 0;
  let rawMerchant = 'Comercio BHD';
  let status = 'Aprobada';
  let transactionType = 'Compra';

  // 2. Extraer de celdas HTML <td>: Fecha, Moneda, Monto, Comercio, Estado, Tipo
  if (rawHtml) {
    const tdMatches = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    while ((match = tdRegex.exec(rawHtml)) !== null) {
      tdMatches.push(stripHtml(match[1]));
    }
    const fechaIndex = tdMatches.findIndex((m) => /Fecha/i.test(m) && !/Detalle/i.test(m));
    if (fechaIndex !== -1 && tdMatches.length >= fechaIndex + 12) {
      const valFecha = tdMatches[fechaIndex + 6];
      const valMoneda = tdMatches[fechaIndex + 7];
      const valMonto = tdMatches[fechaIndex + 8];
      const valComercio = tdMatches[fechaIndex + 9];
      const valEstado = tdMatches[fechaIndex + 10];
      const valTipo = tdMatches[fechaIndex + 11];

      if (valFecha) transactionDate = parseBhdDate(valFecha, data.internalDate);
      if (valMoneda) currency = /US|USD/i.test(valMoneda) ? 'USD' : 'DOP';
      if (valMonto) amount = parseAmount(valMonto);
      if (valComercio && valComercio.trim()) rawMerchant = valComercio.trim();
      if (valEstado && /rechazad|declinad/i.test(valEstado)) status = 'Rechazada';
      if (valTipo && valTipo.trim()) transactionType = valTipo.trim();
    }
  }

  // 3. Fallback en Texto Plano si no hubo celdas HTML
  if (amount === 0 || rawMerchant === 'Comercio BHD') {
    const rowMatch = fullContent.match(
      /(\d{1,2}[/-]\d{1,2}[/-]\d{4}\s+\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\s+(RD|US|DOP|USD|\$)\s+\$?([\d,]+\.\d{2})\s+([^A-Za-z0-9]*(?:SM\s+[A-Za-z0-9\s]+|[A-Za-z0-9\s]+?))\s+(Aprobada|Rechazada|Declinada)\s+([A-Za-z]+)/i
    );
    if (rowMatch) {
      transactionDate = parseBhdDate(rowMatch[1], data.internalDate);
      currency = /US|USD/i.test(rowMatch[2]) ? 'USD' : 'DOP';
      amount = parseAmount(rowMatch[3]);
      rawMerchant = rowMatch[4].trim();
      status = /rechazad|declinad/i.test(rowMatch[5]) ? 'Rechazada' : 'Aprobada';
      transactionType = rowMatch[6].trim();
    }
  }

  if (amount === 0) {
    const fallbackAmt = fullContent.match(/\$([\d,]+\.\d{2})/);
    if (fallbackAmt) amount = parseAmount(fallbackAmt[1]);
  }

  return {
    externalId,
    cardLast4,
    cardType,
    rawMerchant,
    amount: amount > 0 ? amount : 1.0,
    currency,
    status,
    transactionType,
    transactionDate,
    source: 'BHD_EMAIL',
  };
}

if (typeof $input !== 'undefined') {
  const items = $input.all();
  return items.map((item) => ({
    json: parseBhdNotification(item),
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    stripHtml,
    parseBhdDate,
    parseAmount,
    parseBhdNotification,
  };
}
