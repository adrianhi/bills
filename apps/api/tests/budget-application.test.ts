import { describe, expect, it, vi } from 'vitest';
import type { BudgetExpenseReadModel, BudgetRepository } from '../src/modules/budgets/application/budget.ports';
import { GetMonthlyBudget } from '../src/modules/budgets/application/get-monthly-budget';
import { ListBudgetCategories } from '../src/modules/budgets/application/list-budget-categories';
import { ReplaceMonthlyBudget } from '../src/modules/budgets/application/replace-monthly-budget';
import { SuggestBudget } from '../src/modules/budgets/application/suggest-budget';

function ports() {
  const budgets: BudgetRepository = {
    listThroughMonth: vi.fn().mockResolvedValue([]), replaceVersion: vi.fn().mockResolvedValue(undefined),
    exportForWorkspaces: vi.fn().mockResolvedValue([]),
  };
  const expenses: BudgetExpenseReadModel = {
    summarizeMonth: vi.fn().mockResolvedValue([]), history: vi.fn().mockResolvedValue([]),
    firstExpenseMonth: vi.fn().mockResolvedValue(null), listCategoryLabels: vi.fn().mockResolvedValue(['Mi categoría']),
  };
  return { budgets, expenses };
}

describe('budget application', () => {
  it('replaces the current month through the repository and returns a summary', async () => {
    const { budgets, expenses } = ports();
    const categories = new ListBudgetCategories(expenses);
    const summary = new GetMonthlyBudget(budgets, expenses);
    const useCase = new ReplaceMonthlyBudget(budgets, categories, summary);
    await useCase.execute('workspace', {
      month: '2026-09', currency: 'DOP', propagation: 'CURRENT_MONTH', globalLimit: 5000,
      categories: [{ categoryKey: 'mi categoria', amount: 1000 }],
    });
    expect(budgets.replaceVersion).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace', kind: 'MONTH_OVERRIDE', clearMonthOverrides: false,
    }));
  });

  it('suggests medians from complete covered months and requires repeat activity', async () => {
    const { expenses } = ports();
    vi.mocked(expenses.firstExpenseMonth).mockResolvedValue('2026-02');
    vi.mocked(expenses.history).mockImplementation(async (_workspace, _currency, months) => months.map((month, index) => ({
      month,
      expenses: index < 4 ? [{ categoryKey: 'supermercado', approved: 1100 + index * 200, pending: 0, approvedCount: 2 }] : [],
    })));
    const result = await new SuggestBudget(expenses, new ListBudgetCategories(expenses)).execute('workspace', '2026-09', 'DOP');
    expect(result.coverage).toBe(6);
    expect(result.categories[0]).toMatchObject({ categoryKey: 'supermercado', amount: 1200 });
  });

  it('does not dilute a new category with months before its first activity', async () => {
    const { expenses } = ports();
    vi.mocked(expenses.firstExpenseMonth).mockResolvedValue('2026-02');
    vi.mocked(expenses.history).mockImplementation(async (_workspace, _currency, months) => months.map((month, index) => ({
      month,
      expenses: index >= months.length - 2
        ? [{ categoryKey: 'mi categoria', approved: 1000, pending: 0, approvedCount: 1 }]
        : [],
    })));
    const result = await new SuggestBudget(expenses, new ListBudgetCategories(expenses)).execute('workspace', '2026-09', 'DOP');
    expect(result.categories).toContainEqual(expect.objectContaining({ categoryKey: 'mi categoria', amount: 1000, activeMonths: 2 }));
  });

  it('excludes income classifications from the editable category catalog', async () => {
    const { expenses } = ports();
    vi.mocked(expenses.listCategoryLabels).mockResolvedValue(['Transferencia Recibida', 'Ingresós', 'Mascotas']);
    const result = await new ListBudgetCategories(expenses).execute('workspace');
    expect(result.map((item) => item.key)).toContain('mascotas');
    expect(result.map((item) => item.key)).not.toContain('transferencia recibida');
    expect(result.map((item) => item.key)).not.toContain('ingresos');
  });
});
