import { normalizeLabel } from '../../../shared/domain/normalize-label';
import { builtInRules } from './built-in-rules';

// Grouped fallback rules must never collapse distinct brands into one identity.
const identities: [RegExp, string, string][] = [
  [/\buber[\s*]*eats\b/i, 'uber-eats', 'Uber Eats'],
  [/\buber\b/i, 'uber-rides', 'Uber Viajes'],
  [/\bpedidos\s*ya\b/i, 'pedidosya', 'PedidosYa'],
  [/\b(?:farmacia\s+)?carol\b/i, 'farmacia-carol', 'Farmacia Carol'],
  [/\bbravo\b/i, 'bravo', 'Supermercados Bravo'],
  [/\bnetflix\b/i, 'netflix', 'Netflix'],
  [/\bspotify\b/i, 'spotify', 'Spotify'],
];

export function cleanRawMerchant(raw: string): string {
  return raw.trim().replace(/^(SM|EST|FARM|REST|TIENDA|SERV|COMPRA|PAGO)\s+/i, '').replace(/\s+/g, ' ') || 'Comercio Desconocido';
}

export function identifyMerchant(raw: string) {
  const text = normalizeLabel(raw);
  const identity = identities.find(([pattern]) => pattern.test(text));
  const builtIn = builtInRules.find((rule) => rule.pattern.test(text));
  return {
    key: identity ? `brand:${identity[1]}` : `raw:${text}`,
    identityLabel: identity?.[2] || raw.trim(),
    label: builtIn?.merchant || cleanRawMerchant(raw),
    category: builtIn?.category || 'Otros',
  };
}

export const knownMerchants = () => identities.map(([, key, label]) => ({ key: `brand:${key}`, label }));
