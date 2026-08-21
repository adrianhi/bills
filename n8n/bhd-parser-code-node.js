/**
 * Banco BHD Multi-Type Email Parser for n8n Code Node
 *
 * Handles ALL BHD Email Types:
 * 1. Compras con Tarjetas (Débito/Crédito)
 * 2. Transferencias Enviadas (Entre productos BHD, ACH y LBTR)
 * 3. Transferencias Recibidas (Pago al Instante / Pagos de Terceros)
 * 4. Pagos de Servicios e Impuestos (Claro, EdeEste, etc.)
 * 5. Retiros de Efectivo en Cajero
 * (Ignores promotional emails & duplicate debit alerts)
 */

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&aacute;/gi, 'a')
    .replace(/&eacute;/gi, 'e')
    .replace(/&iacute;/gi, 'i')
    .replace(/&oacute;/gi, 'o')
    .replace(/&uacute;/gi, 'u')
    .replace(/&ntilde;/gi, 'n')
    .replace(/&Aacute;/gi, 'A')
    .replace(/&Eacute;/gi, 'E')
    .replace(/&Iacute;/gi, 'I')
    .replace(/&Oacute;/gi, 'O')
    .replace(/&Uacute;/gi, 'U')
    .replace(/&Ntilde;/gi, 'N')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function stripHtml(html) {
  if (!html) return '';
  const noTags = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, ' ');
  return decodeHtmlEntities(noTags).replace(/\s+/g, ' ').trim();
}

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && ['de', 'la', 'del', 'los', 'las', 'y', 'e'].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function parseBhdDate(dateStr, fallbackDate) {
  if (dateStr) {
    const clean = dateStr
      .trim()
      .replace(/[-–|]/g, ' ')
      .replace(/\s+/g, ' ');
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
  }

  if (fallbackDate) {
    if (typeof fallbackDate === 'string' || typeof fallbackDate === 'number') {
      const d = new Date(fallbackDate);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  return new Date().toISOString();
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const clean = String(amountStr).replace(/[^\d.,]/g, '').replace(/,/g, '');
  return parseFloat(clean) || 0;
}

function parseBhdNotification(item) {
  const data = item.json || item;
  
  const rawSubject = data.subject || data.headers?.subject || '';
  const rawHtml = data.html || data.textHtml || data.textAsHtml || data.body || '';
  const rawText = data.text || data.textPlain || data.snippet || '';
  const bodyText = rawHtml ? stripHtml(rawHtml) : decodeHtmlEntities(rawText);
  const fullContent = `${rawSubject} ${bodyText}`.replace(/\s+/g, ' ').trim();
  const externalId = data.messageId || data.id || `bhd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const emailDateFallback = data.date || data.internalDate || data.headers?.date || null;

  // 0. Filtrar correos promocionales
  const isFinancialEmail =
    /Notificacion\s+de\s+Transacciones|transaccion|transferencia|Pago\s+de\s+Servicio|Monto:|Producto\s*:/i.test(fullContent);

  if (!isFinancialEmail && /EVA|promocion|actualiza/i.test(fullContent)) {
    return null;
  }

  // 0.1 Filtrar notificaciones intermedias en proceso
  const isInterimInProgress =
    /Pagos?\s+al\s+Instante\s+en\s+Proceso/i.test(fullContent) ||
    /en\s+proceso/i.test(rawSubject) ||
    (/en\s+proceso/i.test(fullContent) && !/Numero\s+de\s+confirmacion/i.test(fullContent));

  if (isInterimInProgress) {
    return null;
  }

  // 1. TIPO: Transferencias Recibidas (Pago al Instante / Bancos Terceros)
  if (/Has\s+recibido\s+una\s+transferencia/i.test(fullContent) || /Ordenante:/i.test(fullContent)) {
    let sender = 'Transferencia Recibida';
    const ordenanteMatch = fullContent.match(/Ordenante:\s*([A-Za-zÀ-ÿ\s,.'-]+?)(?:\s+Monto:|\s+Fecha|\s+Banco|\s+Nota:|$)/i);
    if (ordenanteMatch && ordenanteMatch[1].trim()) {
      let rawName = ordenanteMatch[1].trim().replace(/^SR\s+|^SRA\s+/i, '');
      if (rawName.includes(',')) {
        const parts = rawName.split(',').map((p) => p.trim());
        if (parts.length === 2 && parts[1] && parts[0]) rawName = `${parts[1]} ${parts[0]}`;
      }
      sender = toTitleCase(rawName);
    }

    let cardLast4 = null;
    const originMatch = fullContent.match(/Producto\s*:\s*([A-Za-z0-9X*]+)/i);
    if (originMatch) {
      const last4 = originMatch[1].match(/(\d{4})$/);
      if (last4) cardLast4 = last4[1];
    }

    let amount = 0;
    const montoMatch = fullContent.match(/Monto:\s*(?:RD|US|DOP|USD|\$)?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (montoMatch) amount = parseAmount(montoMatch[1]);
    if (amount === 0) return null;

    let transactionDate = parseBhdDate(null, emailDateFallback);
    const dateMatch = fullContent.match(/Fecha\s+y\s+hora\s+de\s+la\s+transaccion:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}\s*[-–|]?\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (dateMatch) {
      transactionDate = parseBhdDate(dateMatch[1], emailDateFallback);
    }

    let originBank = 'Banco Tercero';
    const bankMatch = fullContent.match(/Banco\s+Origen:\s*([A-Za-zÀ-ÿ\s,.'-]+?)(?:\s+Ordenante:|\s+Monto:|$)/i);
    if (bankMatch && bankMatch[1].trim()) {
      originBank = toTitleCase(bankMatch[1].trim());
    }

    return {
      externalId: `bhd_rec_${data.id || externalId}`,
      cardLast4,
      cardType: 'Cuenta Bancaria',
      rawMerchant: sender,
      merchant: sender,
      amount,
      currency: 'DOP',
      status: 'Aprobada',
      transactionType: 'Transferencia Recibida',
      category: 'Ingresos / Transferencias',
      notes: `Recibido vía ${originBank}`,
      transactionDate,
      source: 'BHD_TRANSFER_INCOME',
    };
  }

  // 2. TIPO: Pagos de Servicios e Impuestos
  if (/Pago\s+de\s+Servicio/i.test(fullContent) || /Proveedor\s+del\s+servicio:/i.test(fullContent)) {
    let provider = 'Servicio';
    const provMatch = fullContent.match(/Proveedor\s+del\s+servicio:\s*([A-Za-zÀ-ÿ0-9\s,.'-]+?)(?:\s+Servicio:|\s+Descripcion:|\s+Numero|$)/i);
    if (provMatch && provMatch[1].trim()) {
      provider = toTitleCase(provMatch[1].trim());
    }

    let serviceType = '';
    const servMatch = fullContent.match(/Servicio:\s*([A-Za-zÀ-ÿ0-9\s,.'-]+?)(?:\s+Descripcion:|\s+Numero|$)/i);
    if (servMatch && servMatch[1].trim()) {
      serviceType = servMatch[1].trim();
    }

    let cardLast4 = null;
    const originMatch = fullContent.match(/Producto\s+origen:\s*([A-Za-z0-9X*]+)/i);
    if (originMatch) {
      const last4 = originMatch[1].match(/(\d{4})$/);
      if (last4) cardLast4 = last4[1];
    }

    let amount = 0;
    const montoMatch = fullContent.match(/Monto:\s*(?:RD|US|DOP|USD|\$)?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (montoMatch) amount = parseAmount(montoMatch[1]);
    if (amount === 0) return null;

    let confirmationNumber = null;
    const confirmMatch = fullContent.match(/Numero\s+de\s+confirmacion:\s*([A-Za-z0-9-]+)/i);
    if (confirmMatch) confirmationNumber = confirmMatch[1].trim();

    let transactionDate = parseBhdDate(null, emailDateFallback);
    const dateMatch = fullContent.match(/Fecha\s+y\s+hora\s+de\s+la\s+transaccion:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}\s*[-–|]?\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (dateMatch) {
      transactionDate = parseBhdDate(dateMatch[1], emailDateFallback);
    }

    const finalExternalId = confirmationNumber
      ? `bhd_serv_${confirmationNumber.replace(/[^A-Za-z0-9]/g, '')}`
      : externalId;

    return {
      externalId: finalExternalId,
      cardLast4,
      cardType: 'Cuenta Bancaria',
      rawMerchant: provider,
      merchant: provider,
      amount,
      currency: 'DOP',
      status: 'Aprobada',
      transactionType: 'Pago de Servicios',
      category: 'Servicios',
      notes: serviceType || null,
      transactionDate,
      source: 'BHD_SERVICE_PAYMENT',
    };
  }

  // 3. TIPO: Transferencias Enviadas (Comprobante Oficial)
  const isTransferSent =
    /Beneficiario:/i.test(fullContent) ||
    /Transacciones\s+entre\s+productos/i.test(fullContent);

  if (isTransferSent) {
    let beneficiary = 'Transferencia Bancaria';
    const beneficiaryMatch = fullContent.match(/Beneficiario:\s*([A-Za-zÀ-ÿ\s,.'-]+?)(?:\s+Numero\s+de\s+confirmacion|\s+Fecha|\s+Tipo|\s+Nota:|$)/i);
    if (beneficiaryMatch && beneficiaryMatch[1].trim()) {
      let rawName = beneficiaryMatch[1].trim();
      if (rawName.includes(',')) {
        const parts = rawName.split(',').map((p) => p.trim());
        if (parts.length === 2 && parts[1] && parts[0]) rawName = `${parts[1]} ${parts[0]}`;
      }
      beneficiary = toTitleCase(rawName);
    }

    let cardLast4 = null;
    const originMatch = fullContent.match(/Producto\s+origen:\s*([A-Za-z0-9X*]+)/i);
    if (originMatch) {
      const last4 = originMatch[1].match(/(\d{4})$/);
      if (last4) cardLast4 = last4[1];
    }

    let currency = 'DOP';
    let amount = 0;
    const montoMatch = fullContent.match(/Monto:\s*(RD|US|DOP|USD|\$)?\s*\$?\s*([\d,]+\.?\d*)/i);
    if (montoMatch) {
      if (montoMatch[1] && /US|USD/i.test(montoMatch[1])) currency = 'USD';
      amount = parseAmount(montoMatch[2]);
    }
    if (amount === 0) return null;

    let confirmationNumber = null;
    const confirmMatch = fullContent.match(/Numero\s+de\s+confirmacion:\s*([A-Za-z0-9-]+)/i);
    if (confirmMatch) confirmationNumber = confirmMatch[1].trim();

    let transactionDate = parseBhdDate(null, emailDateFallback);
    const dateMatch = fullContent.match(/Fecha\s+y\s+hora\s+de\s+la\s+transaccion:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}\s*[-–|]?\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (dateMatch) {
      transactionDate = parseBhdDate(dateMatch[1], emailDateFallback);
    }

    let notes = null;
    const descMatch = fullContent.match(/Descripcion:\s*([^\n\r]+?)(?:\s+Monto:|\s+Beneficiario:|$)/i);
    if (descMatch && descMatch[1].trim()) notes = descMatch[1].trim();

    const finalExternalId = confirmationNumber
      ? `bhd_conf_${confirmationNumber.replace(/[^A-Za-z0-9]/g, '')}`
      : externalId;

    return {
      externalId: finalExternalId,
      cardLast4,
      cardType: 'Cuenta Bancaria',
      rawMerchant: beneficiary,
      merchant: beneficiary,
      amount,
      currency,
      status: 'Aprobada',
      transactionType: 'Transferencia entre Cuentas',
      category: 'Transferencias',
      notes,
      transactionDate,
      source: 'BHD_TRANSFER_EMAIL',
    };
  }

  // 4. TIPO: Compras con Tarjeta / Retiro de Efectivo (Tabla HTML)
  let cardLast4 = null;
  let cardType = 'Visa Débito';
  const cardHeaderMatch =
    fullContent.match(/(?:Tarjeta\s+)?([A-Za-zÀ-ÿ\s]+?)\s*#\s*(\d{4})/i) ||
    fullContent.match(/(?:Tarjeta|Producto)[^:]*?[:\-]?\s*([A-Za-zÀ-ÿ\s]+)?(?:\*{2,8}|x{2,8})?\s*(\d{4})/i) ||
    fullContent.match(/(\*{2,8}|x{2,8})\s*(\d{4})/i);

  if (cardHeaderMatch) {
    cardLast4 = cardHeaderMatch[2] || cardHeaderMatch[1] || null;
    if (cardHeaderMatch[1] && isNaN(cardHeaderMatch[1])) {
      cardType = cardHeaderMatch[1].replace(/^(Te notificamos la transaccion realizada con tu|Tu)/i, '').trim();
    }
  }

  let transactionDate = parseBhdDate(null, emailDateFallback);
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)?)/i;
  const dateMatch = fullContent.match(dateRegex);
  if (dateMatch) {
    transactionDate = parseBhdDate(dateMatch[1], emailDateFallback);
  }

  let currency = 'DOP';
  let amount = 0;
  let rawMerchant = 'Comercio BHD';
  let status = 'Aprobada';
  let transactionType = 'Compra';

  // Extraer celdas de la tabla HTML
  if (rawHtml) {
    const cellMatches = [];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let match;
    while ((match = cellRegex.exec(rawHtml)) !== null) {
      const text = stripHtml(match[1]);
      if (text) cellMatches.push(text);
    }

    const fechaIdx = cellMatches.findIndex((m) => /Fecha/i.test(m) && !/Detalle/i.test(m));
    if (fechaIdx !== -1 && cellMatches.length >= fechaIdx + 12) {
      const valFecha = cellMatches[fechaIdx + 6];
      const valMoneda = cellMatches[fechaIdx + 7];
      const valMonto = cellMatches[fechaIdx + 8];
      const valComercio = cellMatches[fechaIdx + 9];
      const valEstado = cellMatches[fechaIdx + 10];
      const valTipo = cellMatches[fechaIdx + 11];

      if (valFecha && /\d/.test(valFecha)) transactionDate = parseBhdDate(valFecha, emailDateFallback);
      if (valMoneda) currency = /US|USD/i.test(valMoneda) ? 'USD' : 'DOP';
      if (valMonto) amount = parseAmount(valMonto);
      if (valComercio && valComercio.trim()) rawMerchant = valComercio.trim();
      if (valEstado && /rechazad|declinad|denegad/i.test(valEstado)) status = 'Rechazada';
      if (valTipo && valTipo.trim()) transactionType = valTipo.trim();
    }
  }

  // Fallback de tabla en Texto
  if (amount === 0 || rawMerchant === 'Comercio BHD') {
    const rowMatch = fullContent.match(
      /(\d{1,2}[/-]\d{1,2}[/-]\d{4}\s+\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\s+(RD|US|DOP|USD|\$)\s+\$?([\d,]+\.?\d*)\s+([^A-Za-z0-9]*(?:SM\s+[A-Za-z0-9\s]+|[A-Za-z0-9\s]+?))\s+(Aprobada|Rechazada|Declinada|Denegada[^\s]*)\s+([A-Za-z\s]+)/i
    );
    if (rowMatch) {
      transactionDate = parseBhdDate(rowMatch[1], emailDateFallback);
      currency = /US|USD/i.test(rowMatch[2]) ? 'USD' : 'DOP';
      amount = parseAmount(rowMatch[3]);
      rawMerchant = rowMatch[4].trim();
      status = /rechazad|declinad|denegad/i.test(rowMatch[5]) ? 'Rechazada' : 'Aprobada';
      transactionType = rowMatch[6].trim();
    }
  }

  if (amount === 0) {
    const fallbackAmt = fullContent.match(/\$([\d,]+\.\d{2})/);
    if (fallbackAmt) amount = parseAmount(fallbackAmt[1]);
  }

  if (amount === 0) {
    return null;
  }

  // 4.1. FILTRAR DÉBITOS DUPLICADOS DE TRANSFERENCIAS
  // Si la transacción en la tabla es una transferencia, se ignora porque el BHD siempre emite el comprobante oficial con el nombre completo y número de confirmación.
  const isTransferDebit =
    /transferencia|pagos?\s+al\s+instante|transfer/i.test(transactionType) ||
    /transferencia/i.test(rawMerchant);

  if (isTransferDebit) {
    return null; // Ignorar alerta redundante de tabla
  }

  return {
    externalId,
    cardLast4,
    cardType,
    rawMerchant,
    amount,
    currency,
    status,
    transactionType,
    transactionDate,
    source: 'BHD_EMAIL',
  };
}

if (typeof $input !== 'undefined') {
  const items = $input.all();
  const results = [];
  for (const item of items) {
    const parsed = parseBhdNotification(item);
    if (parsed) {
      results.push({ json: parsed });
    }
  }
  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeHtmlEntities,
    stripHtml,
    toTitleCase,
    parseBhdDate,
    parseAmount,
    parseBhdNotification,
  };
}