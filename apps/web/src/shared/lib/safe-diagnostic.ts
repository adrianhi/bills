import { ApiClientError } from '@/shared/api';

export const BILLS_BETA_VERSION = '2026-08-30.1';

export function safeDiagnostic(error: unknown, area: string, extra: Record<string, string | number | null | undefined> = {}) {
  const normalized = error instanceof ApiClientError ? error : null;
  return [
    'bills. diagnóstico seguro',
    `versión=${BILLS_BETA_VERSION}`,
    `área=${area}`,
    `fecha=${new Date().toISOString()}`,
    `código=${normalized?.code || (error instanceof Error ? error.name : 'UNKNOWN_ERROR')}`,
    `requestId=${normalized?.requestId || 'no-disponible'}`,
    ...Object.entries(extra).map(([key, value]) => `${key}=${value ?? 'no-disponible'}`),
  ].join('\n');
}

export async function copySafeDiagnostic(error: unknown, area: string, extra?: Record<string, string | number | null | undefined>) {
  const diagnostic = safeDiagnostic(error, area, extra);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(diagnostic);
    return;
  }
  const field = document.createElement('textarea');
  field.value = diagnostic;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}
