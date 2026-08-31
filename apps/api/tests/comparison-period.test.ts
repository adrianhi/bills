import { describe, expect, it } from 'vitest';
import { resolveComparisonPeriods } from '../src/modules/analytics/domain/comparison-period';

describe('equivalent comparison periods', () => {
  it('compares a current partial month with the same elapsed days', () => {
    const result = resolveComparisonPeriods({ month: '2026-08' }, new Date('2026-08-15T16:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-15', days: 15, isCurrentMonth: true, monthDays: 31 });
    expect(result?.previous).toMatchObject({ startDate: '2026-07-01', endDate: '2026-07-15', days: 15 });
  });

  it('compares a closed month with the previous complete month', () => {
    const result = resolveComparisonPeriods({ month: '2024-03' }, new Date('2026-08-30T12:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2024-03-01', endDate: '2024-03-31', days: 31 });
    expect(result?.previous).toMatchObject({ startDate: '2024-02-01', endDate: '2024-02-29', days: 29 });
  });

  it('uses an adjacent range with the same duration', () => {
    const result = resolveComparisonPeriods({ startDate: '2026-08-10', endDate: '2026-08-16' }, new Date('2026-08-30T12:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2026-08-10', endDate: '2026-08-16', days: 7 });
    expect(result?.previous).toMatchObject({ startDate: '2026-08-03', endDate: '2026-08-09', days: 7 });
  });

  it('does not compare all-time selections', () => {
    expect(resolveComparisonPeriods({})).toBeNull();
  });

  it('crosses the year boundary when comparing January', () => {
    const result = resolveComparisonPeriods({ month: '2026-01' }, new Date('2026-08-30T12:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2026-01-01', endDate: '2026-01-31', days: 31 });
    expect(result?.previous).toMatchObject({ startDate: '2025-12-01', endDate: '2025-12-31', days: 31 });
  });

  it('handles a partial month when the previous month is shorter (March vs February)', () => {
    const result = resolveComparisonPeriods({ month: '2025-03' }, new Date('2025-03-30T16:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2025-03-01', endDate: '2025-03-30', days: 30, isCurrentMonth: true });
    expect(result?.previous).toMatchObject({ startDate: '2025-02-01', endDate: '2025-02-28', days: 28 });
  });

  it('compares a single-day range with the immediately previous day', () => {
    const result = resolveComparisonPeriods({ startDate: '2026-08-10', endDate: '2026-08-10' }, new Date('2026-08-30T12:00:00Z'));
    expect(result?.current).toMatchObject({ startDate: '2026-08-10', endDate: '2026-08-10', days: 1 });
    expect(result?.previous).toMatchObject({ startDate: '2026-08-09', endDate: '2026-08-09', days: 1 });
  });

  it('rejects ranges that start in the future', () => {
    expect(resolveComparisonPeriods({ startDate: '2026-09-01', endDate: '2026-09-10' }, new Date('2026-08-30T12:00:00Z'))).toBeNull();
  });
});

