import { describe, expect, it } from 'vitest';
import { normalizeCategoryKey } from '../src/modules/budgets/domain/category-key';
import { resolveBudgetLimits, type BudgetLimitRecord } from '../src/modules/budgets/domain/budget-resolution';
import { buildBudgetSummary } from '../src/modules/budgets/domain/budget-progress';
import { median, suggestedAmount } from '../src/modules/budgets/domain/budget-suggestion';

const record = (overrides: Partial<BudgetLimitRecord> = {}): BudgetLimitRecord => ({
  targetKey: 'global', categoryKey: null, categoryLabel: null, scope: 'GLOBAL',
  kind: 'RECURRING', effectiveMonth: new Date('2026-01-01T00:00:00.000Z'),
  amount: 1000, disabled: false, ...overrides,
});

describe('budget domain', () => {
  it('normalizes category keys without accents, case, or repeated spaces', () => {
    expect(normalizeCategoryKey('  Salud   & Farmacía ')).toBe('salud & farmacia');
  });

  it('uses the latest recurring rule and exact month override', () => {
    const resolved = resolveBudgetLimits([
      record(),
      record({ amount: 1200, effectiveMonth: new Date('2026-03-01T00:00:00.000Z') }),
      record({ kind: 'MONTH_OVERRIDE', amount: 800, effectiveMonth: new Date('2026-04-01T00:00:00.000Z') }),
    ], new Date('2026-04-01T00:00:00.000Z'));
    expect(resolved[0].amount).toBe(800);
    expect(resolveBudgetLimits([record()], new Date('2025-12-01T00:00:00.000Z'))).toEqual([]);
  });

  it('resolves disabled records as tombstones', () => {
    expect(resolveBudgetLimits([
      record(), record({ disabled: true, amount: null, effectiveMonth: new Date('2026-06-01T00:00:00.000Z') }),
    ], new Date('2026-06-01T00:00:00.000Z'))).toEqual([]);
  });

  it('keeps pending expenses separate and prioritizes exceeded alerts', () => {
    const summary = buildBudgetSummary({
      month: '2026-09', currency: 'DOP', now: new Date('2026-09-10T16:00:00.000Z'),
      limits: [
        { ...record(), amount: 1000 },
        { ...record(), targetKey: 'category:comida', categoryKey: 'comida', categoryLabel: 'Comida', scope: 'CATEGORY', amount: 400 },
      ],
      expenses: [{ categoryKey: 'comida', approved: 450, pending: 100, approvedCount: 3 }],
    });
    expect(summary.totalSpent).toBe(450);
    expect(summary.totalPending).toBe(100);
    expect(summary.categories[0]).toMatchObject({ status: 'EXCEEDED', exceededBy: 50, pending: 100 });
    expect(summary.alerts[0].categoryKey).toBe('comida');
  });

  it('calculates robust suggestions and currency rounding', () => {
    expect(median([100, 1000, 200])).toBe(200);
    expect(median([100, 300])).toBe(200);
    expect(suggestedAmount([151, 200, 1000], 'DOP')).toBe(200);
    expect(suggestedAmount([11, 12], 'USD')).toBe(15);
  });
});
