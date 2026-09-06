import type { RecurringCadenceName } from './recurring-detection';
import { nextCadenceDate } from './recurring-detection';

const DAY_MS = 86_400_000;
export const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);
export const parseDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const daysFrom = (today: string, target: Date) =>
  Math.round((parseDateOnly(toDateOnly(target)).getTime() - parseDateOnly(today).getTime()) / DAY_MS);

export function monthlyBurden(amount: number, cadence: RecurringCadenceName) {
  if (cadence === 'BIWEEKLY') return amount * 2;
  if (cadence === 'ANNUAL') return amount / 12;
  return amount;
}

export function projectedDates(
  first: Date,
  cadence: RecurringCadenceName,
  afterInclusive: Date,
  throughInclusive: Date,
) {
  const dates: Date[] = [];
  let candidate = new Date(first);
  let guard = 0;
  while (candidate < afterInclusive && guard++ < 30) candidate = nextCadenceDate(candidate, cadence);
  while (candidate <= throughInclusive && guard++ < 60) {
    dates.push(new Date(candidate));
    candidate = nextCadenceDate(candidate, cadence);
  }
  return dates;
}
