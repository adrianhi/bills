import { describe, expect, it } from 'vitest';
import { detectRecurring, nextCadenceDate } from '../src/modules/recurring/domain/recurring-detection';
import { projectedDates } from '../src/modules/recurring/domain/recurring-projection';

const observation = (id: string, amount: number, date: string) => ({
  id, amount, occurredAt: new Date(`${date}T00:00:00.000Z`),
});

describe('recurring detection', () => {
  it('suggests a monthly cadence from two compatible observations', () => {
    const result = detectRecurring([
      observation('one', 1000, '2026-07-05'), observation('two', 1050, '2026-08-05'),
    ]);
    expect(result?.cadence).toBe('MONTHLY');
    expect(result?.nextExpectedDate.toISOString().slice(0, 10)).toBe('2026-09-05');
  });

  it('rejects amounts outside the ten percent cluster', () => {
    expect(detectRecurring([
      observation('one', 1000, '2026-07-05'), observation('two', 1300, '2026-08-05'),
    ])).toBeNull();
  });

  it('detects a price hike above five percent within the cluster', () => {
    const result = detectRecurring([
      observation('one', 1000, '2026-06-05'), observation('two', 1000, '2026-07-05'),
      observation('three', 1080, '2026-08-05'),
    ]);
    expect(result?.priceHike).toEqual({ transactionId: 'three', baseline: 1000, observed: 1080 });
  });

  it('clamps monthly dates and projects every future occurrence', () => {
    expect(nextCadenceDate(new Date('2028-01-31T00:00:00Z'), 'MONTHLY').toISOString().slice(0, 10))
      .toBe('2028-02-29');
    expect(projectedDates(
      new Date('2026-09-10T00:00:00Z'), 'BIWEEKLY',
      new Date('2026-09-10T00:00:00Z'), new Date('2026-09-30T00:00:00Z'),
    )).toHaveLength(2);
  });
});
