import { describe, expect, it } from 'vitest';
import { calculateSafeToSpend } from '../src/modules/budgets/domain/safe-to-spend';

const base = {
  date: '2028-02-15', month: '2028-02', currency: 'DOP' as const,
  dayOfMonth: 15, daysInMonth: 29, globalLimit: 30_000,
  spentBeforeToday: 15_000, spentToday: 500, futureConfirmedCommitments: 0,
};

describe('safe to spend', () => {
  it('does not discount today twice', () => {
    const result = calculateSafeToSpend(base);
    expect(result.dailyAllowance).toBe(1_000);
    expect(result.todayAvailable).toBe(500);
    expect(result.nextDailyAllowance).toBeCloseTo(1035.71, 2);
  });

  it('reserves confirmed commitments before distributing the balance', () => {
    const result = calculateSafeToSpend({ ...base, futureConfirmedCommitments: 3_000 });
    expect(result.dailyAllowance).toBe(800);
    expect(result.todayAvailable).toBe(300);
    expect(result.reason).toBe('UPCOMING_COMMITMENTS');
  });

  it('returns an unset state without a global budget', () => {
    const result = calculateSafeToSpend({ ...base, globalLimit: null });
    expect(result.status).toBe('UNSET');
    expect(result.daysRemaining).toBe(15);
  });

  it('reports an overage without returning a negative available amount', () => {
    const result = calculateSafeToSpend({ ...base, spentToday: 1_250 });
    expect(result.status).toBe('ADJUSTING');
    expect(result.todayAvailable).toBe(0);
    expect(result.todayOverage).toBe(250);
  });
});
