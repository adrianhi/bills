import type { DateRange } from '../../transactions/domain/transaction-policy';

const TIMEZONE = 'America/Santo_Domingo';

const dateValue = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const boundary = (value: string, end = false) => new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}-04:00`);

const addDays = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const daysBetweenInclusive = (start: string, end: string) => {
  const startValue = Date.parse(`${start}T00:00:00.000Z`);
  const endValue = Date.parse(`${end}T00:00:00.000Z`);
  return Math.floor((endValue - startValue) / 86_400_000) + 1;
};

const monthStart = (month: string) => `${month}-01`;

const monthEnd = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value, 0)).toISOString().slice(0, 10);
};

const previousMonth = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 2, 1)).toISOString().slice(0, 7);
};

export interface ComparablePeriod {
  startDate: string;
  endDate: string;
  days: number;
  range: DateRange;
  isCurrentMonth: boolean;
  monthDays: number;
}

export interface ComparisonPeriods {
  current: ComparablePeriod;
  previous: ComparablePeriod;
}

const period = (startDate: string, endDate: string, isCurrentMonth = false, monthDays = daysBetweenInclusive(startDate, endDate)): ComparablePeriod => ({
  startDate,
  endDate,
  days: daysBetweenInclusive(startDate, endDate),
  range: { gte: boundary(startDate), lte: boundary(endDate, true) },
  isCurrentMonth,
  monthDays,
});

export function resolveComparisonPeriods(request: { month?: string; startDate?: string; endDate?: string }, now = new Date()): ComparisonPeriods | null {
  const today = dateValue(now);
  if (request.month && /^\d{4}-\d{2}$/.test(request.month)) {
    const start = monthStart(request.month);
    const fullEnd = monthEnd(request.month);
    const currentMonth = today.slice(0, 7) === request.month;
    const end = currentMonth && today < fullEnd ? today : fullEnd;
    const priorMonth = previousMonth(request.month);
    const priorStart = monthStart(priorMonth);
    const priorFullEnd = monthEnd(priorMonth);
    const priorEnd = currentMonth
      ? addDays(priorStart, Math.min(daysBetweenInclusive(start, end), daysBetweenInclusive(priorStart, priorFullEnd)) - 1)
      : priorFullEnd;
    return {
      current: period(start, end, currentMonth, daysBetweenInclusive(start, fullEnd)),
      previous: period(priorStart, priorEnd, false, daysBetweenInclusive(priorStart, priorFullEnd)),
    };
  }

  if (request.startDate && request.endDate) {
    const start = request.startDate.slice(0, 10);
    const requestedEnd = request.endDate.slice(0, 10);
    const end = requestedEnd > today ? today : requestedEnd;
    if (end < start) return null;
    const days = daysBetweenInclusive(start, end);
    const priorEnd = addDays(start, -1);
    const priorStart = addDays(priorEnd, -(days - 1));
    return { current: period(start, end), previous: period(priorStart, priorEnd) };
  }

  return null;
}

