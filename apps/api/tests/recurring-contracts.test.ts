import { describe, expect, it } from 'vitest';
import { createRecurringBillSchema, recurringRadarSchema } from '@bills/contracts';

describe('recurring contracts and radar schema', () => {
  it('validates valid manual recurring bill input', () => {
    const valid = createRecurringBillSchema.parse({
      displayName: 'Alquiler Piantini',
      expectedAmount: 32000,
      currency: 'DOP',
      cadence: 'MONTHLY',
      nextExpectedDate: '2026-09-15',
    });
    expect(valid.displayName).toBe('Alquiler Piantini');
    expect(valid.expectedAmount).toBe(32000);
    expect(valid.cadence).toBe('MONTHLY');
  });

  it('rejects invalid inputs', () => {
    expect(() => createRecurringBillSchema.parse({
      displayName: '',
      expectedAmount: -500,
      nextExpectedDate: 'not-a-date',
    })).toThrow();
  });

  it('parses radar schema with monthly realization and discretionary cash', () => {
    const radar = recurringRadarSchema.parse({
      currency: 'DOP',
      generatedAt: '2026-09-06T20:00:00.000Z',
      analysisStatus: 'READY',
      fixedMonthlyBurden: 25000,
      paidThisMonth: 15000,
      pendingThisMonth: 10000,
      estimatedMonthlyIncome: 70000,
      freeDiscretionaryCash: 45000,
      upcoming: [],
      allConfirmed: [],
      upcomingWindows: { in7: 1, in14: 2, in30: 3 },
      suggestions: [],
      attention: [],
      paused: [],
    });
    expect(radar.fixedMonthlyBurden).toBe(25000);
    expect(radar.paidThisMonth).toBe(15000);
    expect(radar.pendingThisMonth).toBe(10000);
    expect(radar.freeDiscretionaryCash).toBe(45000);
  });
});
