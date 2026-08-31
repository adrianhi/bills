import { prisma } from '../config/database';
import { SecretCryptoService } from '../shared/infrastructure/secret-crypto.service';

const TOKENS = [
  'fecha', 'moneda', 'monto', 'comercio', 'estado', 'tipo', 'aprobada', 'rechazada',
  'reversada', 'compra', 'transferencia', 'transacción', 'transaccion', 'tarjeta',
  'retiro', 'débito', 'debito', 'cuenta', 'balance', 'valor', 'importe', 'rd', 'dop', 'usd',
];

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function structuralTags(html: string) {
  return Array.from(html.matchAll(/<\/?\s*([a-z0-9]+)/gi))
    .map((match) => match[0].startsWith('</') ? `/${match[1].toLowerCase()}` : match[1].toLowerCase())
    .slice(0, 300);
}

function knownTokens(value: string) {
  const lower = value.toLowerCase();
  return TOKENS.filter((token) => token.length > 3
    ? lower.includes(token)
    : new RegExp(`(^|[^a-záéíóúñ])${token}([^a-záéíóúñ]|$)`, 'i').test(lower));
}

function semanticFlags(value: string) {
  return {
    transactionNotification: /notificaci[oó]n\s+de\s+transacciones|transacci[oó]n\s+realizada/i.test(value),
    transactionLanguage: /transacci[oó]n/i.test(value),
    withdrawalLanguage: /retiro\s+(?:de\s+)?(?:efectivo|cajero)|cajero\s+autom[aá]tico/i.test(value),
    amountLabel: /\b(?:monto|valor|importe)\b/i.test(value),
    bareCurrencyAmount: /\b(?:RD|DOP|USD|US)\s*\$?\s*\d[\d.,]*/i.test(value),
    statusLanguage: /\b(?:aprobada|rechazada|reversada|pendiente)\b/i.test(value),
    securityLanguage: /\b(?:c[oó]digo|clave|otp|verificaci[oó]n|inicio\s+de\s+sesi[oó]n)\b/i.test(value),
    statementLanguage: /estado\s+de\s+cuenta|resumen\s+de\s+cuenta/i.test(value),
    promotionalLanguage: /promoci[oó]n|oferta|conoce\s+(?:m[aá]s|nuestras)/i.test(value),
  };
}

function plain(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rowShapes(html: string) {
  return Array.from(html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)).map((table) =>
    Array.from(table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((row) =>
      Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cell) => {
        const value = plain(cell[1]);
        return {
          length: value.length,
          tokens: knownTokens(value),
          numericGroups: (value.match(/\d[\d.,]*/g) || []).length,
          hasCurrencySymbol: /\$/.test(value),
        };
      })
    )
  );
}

function blockShapes(html: string) {
  return Array.from(html.matchAll(/<(p|div|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map((block) => {
    const value = plain(block[2]);
    return {
      tag: block[1].toLowerCase(),
      length: value.length,
      tokens: knownTokens(value),
      numericGroups: (value.match(/\d[\d.,]*/g) || []).length,
      hasCurrencySymbol: /\$/.test(value),
    };
  });
}

async function run() {
  const parserVersion = argument('parser-version');
  const errorCode = argument('error');
  const limit = Math.min(Math.max(Number(argument('limit') || 1), 1), 100);
  const compact = process.argv.includes('--compact');
  const events = await prisma.ingestionEvent.findMany({
    where: {
      provider: 'GOOGLE_GMAIL',
      status: 'FAILED',
      parserCode: 'BHD',
      rawContent: { not: null },
      ...(parserVersion ? { parserVersion } : {}),
      ...(errorCode ? { errorCode } : {}),
    },
    select: { id: true, rawContent: true, parserVersion: true, errorCode: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  if (!events.length) throw new Error('No encrypted Gmail failure is available.');
  const diagnostics = events.flatMap((event) => {
    if (!event.rawContent) return [];
    const payload = JSON.parse(SecretCryptoService.decrypt(event.rawContent)) as {
      subject?: string | null;
      html?: string | null;
      text?: string | null;
    };
    const html = payload.html || '';
    const text = payload.text || '';
    const counts = Object.fromEntries(
      ['table', 'tr', 'td', 'th', 'div', 'span', 'br'].map((tag) => [
        tag,
        Array.from(html.matchAll(new RegExp(`<${tag}\\b`, 'gi'))).length,
      ])
    );
    const base = {
      eventId: event.id,
      parserVersion: event.parserVersion,
      errorCode: event.errorCode,
      subjectLength: (payload.subject || '').length,
      subjectKnownTokens: knownTokens(payload.subject || ''),
      subjectFlags: semanticFlags(payload.subject || ''),
      htmlLength: html.length,
      textLength: text.length,
      counts,
      documentFlags: semanticFlags(`${payload.subject || ''} ${html} ${text}`),
      htmlKnownTokens: knownTokens(html),
      textKnownTokens: knownTokens(text),
    };
    return [{
      ...base,
      ...(compact ? {} : {
      rowShapes: rowShapes(html),
      blockShapes: blockShapes(html),
      tags: structuralTags(html),
      }),
    }];
  });
  console.log(JSON.stringify({ diagnostics }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
