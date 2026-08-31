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
