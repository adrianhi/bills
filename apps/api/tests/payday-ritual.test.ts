import { describe, expect, it } from 'vitest';
import { calculatePaydayAmounts, currentPaydayCycle } from '../src/modules/payday-ritual/domain/payday-cycle';
import { PaydayRitualService } from '../src/modules/payday-ritual';

describe('payday ritual', () => {
  it('uses February last day as the second payday', () => {
    expect(currentPaydayCycle('2028-02-29')).toMatchObject({
      key: '2028-02-29', start: '2028-02-29', end: '2028-03-14', daysRemaining: 15,
    });
  });

  it('keeps the day 30 cycle active through the next day 14', () => {
    expect(currentPaydayCycle('2026-10-01')).toMatchObject({
      key: '2026-09-30', start: '2026-09-30', end: '2026-10-14', daysRemaining: 14,
    });
  });

  it('separates available money and overage', () => {
    expect(calculatePaydayAmounts({
      plannedIncome: 20_000, paidFixed: 4_000, otherSpent: 3_000, futureFixed: 2_000, daysRemaining: 10,
    })).toEqual({ available: 11_000, overage: 0, dailyAvailable: 1_100 });
    expect(calculatePaydayAmounts({
      plannedIncome: 5_000, paidFixed: 4_000, otherSpent: 3_000, futureFixed: 0, daysRemaining: 2,
    })).toEqual({ available: 0, overage: 2_000, dailyAvailable: 0 });
  });

  it('returns unavailable without a configured biweekly income', async () => {
    const service = new PaydayRitualService(
      { plannedBiweeklyIncome: async () => 0 },
      { summarizeCycle: async () => ({ paidFixed: 0, otherSpent: 0 }) },
      { sumFutureThrough: async () => 0 },
      { completedAt: async () => null, complete: async () => new Date() },
    );
    expect((await service.current('workspace', 'profile', 'DOP')).status).toBe('UNAVAILABLE');
  });
});
