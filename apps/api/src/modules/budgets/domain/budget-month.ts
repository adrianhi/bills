const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function monthDate(month: string): Date {
  if (!MONTH_PATTERN.test(month)) throw new Error('Invalid budget month');
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function santoDomingoMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

export function elapsedMonthDays(month: string, now = new Date()) {
  const [year, value] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, value, 0)).getUTCDate();
  const current = santoDomingoMonth(now);
  if (month < current) return { elapsedDays: daysInMonth, daysInMonth, current: false };
  if (month > current) return { elapsedDays: 0, daysInMonth, current: false };
  const day = Number(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', day: '2-digit',
  }).format(now));
  return { elapsedDays: day, daysInMonth, current: true };
}

export function previousMonths(month: string, count: number): string[] {
  const [year, value] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, value - index - 1, 1));
    return date.toISOString().slice(0, 7);
  }).reverse();
}
