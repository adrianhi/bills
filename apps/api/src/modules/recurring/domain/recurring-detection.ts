export type RecurringCadenceName = 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL';

export interface RecurringObservation {
  id: string;
  amount: number;
  occurredAt: Date;
}

export interface RecurringDetection {
  cadence: RecurringCadenceName;
  expectedAmount: number;
  nextExpectedDate: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  confidence: number;
  observations: RecurringObservation[];
  priceHike: null | { transactionId: string; baseline: number; observed: number };
}

const DAY_MS = 86_400_000;
const round = (value: number) => Math.round(value * 100) / 100;
const daysBetween = (left: Date, right: Date) => Math.round((right.getTime() - left.getTime()) / DAY_MS);

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cadenceFor(intervals: number[]): RecurringCadenceName | null {
  const typical = median(intervals);
  if (typical >= 14 && typical <= 16) return 'BIWEEKLY';
  if (typical >= 28 && typical <= 32) return 'MONTHLY';
  if (typical >= 360 && typical <= 370) return 'ANNUAL';
  return null;
}

export function nextCadenceDate(date: Date, cadence: RecurringCadenceName): Date {
  const next = new Date(date);
  if (cadence === 'BIWEEKLY') next.setUTCDate(next.getUTCDate() + 15);
  if (cadence === 'MONTHLY') {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const finalDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, finalDay));
  }
  if (cadence === 'ANNUAL') next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

export function detectRecurring(observations: RecurringObservation[]): RecurringDetection | null {
  const ordered = [...observations].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  if (ordered.length < 2) return null;
  const intervals = ordered.slice(1).map((item, index) => daysBetween(ordered[index].occurredAt, item.occurredAt));
  const cadence = cadenceFor(intervals);
  if (!cadence) return null;
  const compatible = intervals.filter((interval) => cadenceFor([interval]) === cadence).length;
  if (compatible < Math.ceil(intervals.length * 0.75)) return null;
  const expectedAmount = median(ordered.map((item) => item.amount));
  if (ordered.some((item) => Math.abs(item.amount - expectedAmount) / expectedAmount > 0.1)) return null;
  const latest = ordered.at(-1)!;
  const prior = ordered.slice(0, -1);
  const baseline = prior.reduce((sum, item) => sum + item.amount, 0) / prior.length;
  return {
    cadence, expectedAmount: round(expectedAmount), nextExpectedDate: nextCadenceDate(latest.occurredAt, cadence),
    lastSeenAt: latest.occurredAt, occurrenceCount: ordered.length,
    confidence: Math.min(0.95, round(0.5 + (ordered.length - 2) * 0.15)), observations: ordered,
    priceHike: latest.amount > baseline * 1.05
      ? { transactionId: latest.id, baseline: round(baseline), observed: round(latest.amount) }
      : null,
  };
}
