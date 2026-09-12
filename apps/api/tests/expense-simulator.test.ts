import { describe, expect, it } from 'vitest';
import type { BudgetSummaryDto, SafeToSpendDto } from '@bills/contracts';
import { simulateExpenseImpact } from '../src/modules/proactivity/domain/expense-simulator';

describe('simulateExpenseImpact', () => {
  const baseSafeToSpend: SafeToSpendDto = {
    date: '2026-09-12',
    month: '2026-09',
    currency: 'DOP',
    status: 'SURPLUS',
    reason: 'NONE',
    globalLimit: 50000,
    spentBeforeToday: 10000,
    spentToday: 500,
    futureConfirmedCommitments: 5000,
    daysRemaining: 19,
    dailyAllowance: 1842,
    todayAvailable: 1342,
    todayOverage: 0,
    nextDailyAllowance: 1842,
  };

  const baseBudgetSummary: BudgetSummaryDto = {
    month: '2026-09',
    currency: 'DOP',
    hasBudget: true,
    propagation: 'CURRENT_AND_FUTURE',
    totalSpent: 10500,
    totalPending: 0,
    unbudgetedSpent: 0,
    global: null,
    categories: [
      {
        scope: 'CATEGORY',
        categoryKey: 'restaurantes',
        categoryLabel: 'Restaurantes',
        limit: 8000,
        spent: 3000,
        pending: 0,
        remaining: 5000,
        exceededBy: 0,
        percentUsed: 37.5,
        projected: 6000,
        status: 'HEALTHY',
      },
    ],
    alerts: [],
  };

  it('returns SAFE when expense is small and preserves healthy daily allowance', () => {
    const result = simulateExpenseImpact({
      amount: 1200,
      categoryKey: 'restaurantes',
      currency: 'DOP',
      safeToSpend: baseSafeToSpend,
      budgetSummary: baseBudgetSummary,
    });

    expect(result.verdict).toBe('SAFE');
    expect(result.simulatedAmount).toBe(1200);
    expect(result.projectedDailyAllowance).toBeGreaterThan(0);
    expect(result.categoryImpact?.status).toBe('HEALTHY');
    expect(result.categoryImpact?.projectedPercent).toBe(53); // (3000+1200)/8000
    expect(result.adviceTitle).toContain('Compra dentro de tu plan');
  });

  it('returns TIGHT when expense significantly shrinks daily margin or triggers category PACE_WARNING', () => {
    const result = simulateExpenseImpact({
      amount: 4000, // 3000 + 4000 = 7000 / 8000 = 87.5% -> PACE_WARNING
      categoryKey: 'restaurantes',
      currency: 'DOP',
      safeToSpend: baseSafeToSpend,
      budgetSummary: baseBudgetSummary,
    });

    expect(result.verdict).toBe('TIGHT');
    expect(result.categoryImpact?.status).toBe('PACE_WARNING');
    expect(result.categoryImpact?.projectedPercent).toBe(88);
    expect(result.adviceTitle).toContain('margen ajustado');
  });

  it('returns OVERSPEND when expense exceeds category limit', () => {
    const result = simulateExpenseImpact({
      amount: 6000, // 3000 + 6000 = 9000 > 8000 limit
      categoryKey: 'restaurantes',
      currency: 'DOP',
      safeToSpend: baseSafeToSpend,
      budgetSummary: baseBudgetSummary,
    });

    expect(result.verdict).toBe('OVERSPEND');
    expect(result.categoryImpact?.status).toBe('EXCEEDED');
    expect(result.categoryImpact?.projectedPercent).toBe(113);
    expect(result.adviceTitle).toContain('sobregiro');
    expect(result.adviceDescription).toContain('superará el límite de Restaurantes');
  });

  it('handles simulation without category specified', () => {
    const result = simulateExpenseImpact({
      amount: 2000,
      currency: 'DOP',
      safeToSpend: baseSafeToSpend,
      budgetSummary: baseBudgetSummary,
    });

    expect(result.verdict).toBe('SAFE');
    expect(result.categoryImpact).toBeNull();
    expect(result.projectedDailyAllowance).toBeLessThan(baseSafeToSpend.dailyAllowance);
  });
});
