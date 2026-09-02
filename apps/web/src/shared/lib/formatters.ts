export function formatCurrency(amount: number | null | undefined, currency = 'DOP'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '-';
  const code = (currency || 'DOP').toUpperCase();
  const prefix = code === 'USD' ? '$ ' : code === 'EUR' ? '€ ' : 'RD$ ';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${prefix}${formatted}`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
}

export function formatRelativeDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (Number.isNaN(date.getTime())) return String(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat('es-DO', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
  if (date.toDateString() === now.toDateString()) return `Hoy, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}

export function formatMonthLabel(monthIso: string | null | undefined): string {
  if (!monthIso) return 'este mes';
  const match = /^(\d{4})-(\d{2})/.exec(monthIso);
  if (!match) return String(monthIso);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = new Date(year, month, 1);
  const monthName = new Intl.DateTimeFormat('es-DO', { month: 'long' }).format(date);
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const currentYear = new Date().getFullYear();
  return year === currentYear ? capitalized : `${capitalized} ${year}`;
}

export function formatAmountInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const str = typeof value === 'number' ? String(value) : value;
  // If ends with dot, keep it
  const hasTrailingDot = str.endsWith('.');
  const parts = str.replace(/[^0-9.]/g, '').split('.');
  if (!parts[0] && parts.length === 1) return '';
  const integerFormatted = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '0';
  if (parts.length > 1) {
    return `${integerFormatted}.${parts[1].slice(0, 2)}`;
  }
  return hasTrailingDot ? `${integerFormatted}.` : integerFormatted;
}

export function parseAmountInput(value: string): string {
  if (!value) return '';
  const clean = value.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return Number.isNaN(num) ? '' : String(num);
}

