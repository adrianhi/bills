import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinancialReportQuerySchema } from '../src/schemas/transaction.schema';
import { resolveReportScope } from '../src/modules/reports/domain/report-scope';

const now = new Date('2026-09-02T02:30:00Z'); // September 1 in Santo Domingo.
afterEach(() => vi.useRealTimers());

describe('financial report scope', () => {
  it('preserves all-time and applies DOP by default', () => {
    expect(resolveReportScope({}, now)).toMatchObject({ kind: 'all', currency: 'DOP', comparison: null });
  });
  it('caps the current month once in Dominican time and preserves monthly comparison', () => {
    const scope = resolveReportScope({ month: '2026-09', currency: 'usd' }, now);
    expect(scope).toMatchObject({
      kind: 'month', currency: 'USD',
      comparison: {
        current: { startDate: '2026-09-01', endDate: '2026-09-01', days: 1 },
        previous: { startDate: '2026-08-01', endDate: '2026-08-01', days: 1 },
      },
    });
  });
  it.each([
    ['2024-02', '2024-02-29', '2024-01-01', '2024-01-31'],
    ['2025-02', '2025-02-28', '2025-01-01', '2025-01-31'],
    ['2026-01', '2026-01-31', '2025-12-01', '2025-12-31'],
  ])('resolves closed month %s', (month, endDate, previousStart, previousEnd) => {
    expect(resolveReportScope({ month }, now).comparison).toMatchObject({
      current: { endDate }, previous: { startDate: previousStart, endDate: previousEnd },
    });
  });
  it('compares a one-day range with the previous day', () => {
    expect(resolveReportScope({ startDate: '2026-01-01', endDate: '2026-01-01' }, now).comparison)
      .toMatchObject({ current: { days: 1 }, previous: { startDate: '2025-12-31', endDate: '2025-12-31' } });
  });
  it.each([
    { month: '2026-13' }, { month: '2026-10' },
    { startDate: '2026-02-30', endDate: '2026-03-02' },
    { startDate: '2026-01-01' }, { endDate: '2026-01-01' },
    { startDate: '2026-08-10', endDate: '2026-08-01' },
    { startDate: '2026-09-01', endDate: '2026-09-02' },
    { month: '2026-08', startDate: '2026-08-01', endDate: '2026-08-31' },
    { currency: 'EUR' },
  ])('rejects ambiguous or invalid report scope %j', (scope) => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    expect(FinancialReportQuerySchema.safeParse({ format: 'pdf', ...scope }).success).toBe(false);
  });
});
