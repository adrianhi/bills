export interface DateRangeValue {
  from: string;
  to: string;
}

export function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromDateValue(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function currentLocalDateTime(date = new Date()) {
  return `${toDateValue(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isFutureLocalDateTime(value: string, now = new Date()) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.getTime() > now.getTime();
}

export function formatDateLabel(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  const date = fromDateValue(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-DO', options ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function normalizeRange(value: DateRangeValue): DateRangeValue {
  if (!value.from || !value.to || value.from <= value.to) return value;
  return { from: value.to, to: value.from };
}
