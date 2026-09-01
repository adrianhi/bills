import type { BudgetSuggestionDto } from '@bills/contracts';
import type { BudgetExpenseReadModel } from './budget.ports';
import type { BudgetCurrency } from './types';
import { previousMonths } from '../domain/budget-month';
import { suggestedAmount } from '../domain/budget-suggestion';
import { ListBudgetCategories } from './list-budget-categories';

function nextMonth(month: string) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value, 1)).toISOString().slice(0, 7);
}

export class SuggestBudget {
  constructor(private readonly expenses: BudgetExpenseReadModel, private readonly categories: ListBudgetCategories) {}

  async execute(workspaceId: string, month: string, currency: BudgetCurrency): Promise<BudgetSuggestionDto> {
    const candidates = previousMonths(month, 6);
    const first = await this.expenses.firstExpenseMonth(workspaceId, currency);
    const usable = first ? candidates.filter((item) => item >= nextMonth(first)) : [];
    if (usable.length < 2) return { month, currency, monthsUsed: usable, coverage: usable.length, globalLimit: null, categories: [] };
    const [history, catalog] = await Promise.all([
      this.expenses.history(workspaceId, currency, usable), this.categories.execute(workspaceId),
    ]);
    const labels = new Map(catalog.map((item) => [item.key, item.label]));
    const byMonth = new Map(history.map((item) => [item.month, item.expenses]));
    const keys = new Set(history.flatMap((item) => item.expenses.map((expense) => expense.categoryKey)));
    const totalValues = usable.map((candidate) => (byMonth.get(candidate) || []).reduce((sum, item) => sum + item.approved, 0));
    const suggestions = [...keys].flatMap((key) => {
      const values = usable.map((candidate) => byMonth.get(candidate)?.find((item) => item.categoryKey === key)?.approved || 0);
      const firstActiveMonth = values.findIndex((value) => value > 0);
      const categoryHistory = firstActiveMonth >= 0 ? values.slice(firstActiveMonth) : [];
      const activeMonths = categoryHistory.filter((value) => value > 0).length;
      const amount = activeMonths >= 2 ? suggestedAmount(categoryHistory, currency) : null;
      const label = labels.get(key);
      return amount && label ? [{ categoryKey: key, categoryLabel: label, amount, activeMonths }] : [];
    }).sort((a, b) => b.amount - a.amount);
    return {
      month, currency, monthsUsed: usable, coverage: usable.length,
      globalLimit: suggestedAmount(totalValues, currency), categories: suggestions,
    };
  }
}
