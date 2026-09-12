import type { EmailDigestSchedule } from '@bills/contracts';

const DAY_MS = 86_400_000;

interface LocalParts {
  year: number; month: number; day: number; weekday: number; hour: number; minute: number;
}

export function validTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone }).format(); return true; } catch { return false; }
}

function localParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value('year')), month: Number(value('month')), day: Number(value('day')),
    weekday: weekdays[value('weekday')], hour: Number(value('hour')), minute: Number(value('minute')),
  };
}

function zonedDate(parts: Omit<LocalParts, 'weekday'>, timeZone: string): Date {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let result = new Date(desired);
  for (let i = 0; i < 3; i++) {
    const actual = localParts(result, timeZone);
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    result = new Date(result.getTime() + desired - actualUtc);
  }
  return result;
}

export function shiftLocalDays(date: Date, days: number, timeZone: string): Date {
  const p = localParts(date, timeZone);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedDate({
    year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(),
    hour: p.hour, minute: p.minute,
  }, timeZone);
}

export function nextDigestAt(now: Date, timeZone: string, schedule: EmailDigestSchedule): Date {
  const p = localParts(now, timeZone);
  const target = schedule === 'MONDAY_0730'
    ? { weekday: 1, hour: 7, minute: 30 }
    : { weekday: 0, hour: 18, minute: 0 };
  let daysAhead = (target.weekday - p.weekday + 7) % 7;
  let base = new Date(Date.UTC(p.year, p.month - 1, p.day + daysAhead));
  let candidate = zonedDate({
    year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate(),
    hour: target.hour, minute: target.minute,
  }, timeZone);
  if (candidate <= now) {
    daysAhead += 7;
    base = new Date(Date.UTC(p.year, p.month - 1, p.day + daysAhead));
    candidate = zonedDate({
      year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate(),
      hour: target.hour, minute: target.minute,
    }, timeZone);
  }
  return candidate;
}

export function rollingDigestWindow(scheduledAt: Date, timeZone: string) {
  const currentEnd = scheduledAt;
  const currentStart = shiftLocalDays(currentEnd, -7, timeZone);
  const previousStart = shiftLocalDays(currentStart, -7, timeZone);
  const previousEnd = new Date(currentStart.getTime() - 1);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

export function digestCycleKey(scheduledAt: Date, schedule: EmailDigestSchedule, timeZone: string): string {
  const sunday = schedule === 'MONDAY_0730' ? shiftLocalDays(scheduledAt, -1, timeZone) : scheduledAt;
  const p = localParts(sunday, timeZone);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const thursday = new Date(day.getTime() + (4 - (day.getUTCDay() || 7)) * DAY_MS);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function localDateString(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
