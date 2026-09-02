import { COMMON_EXPENSE_CATEGORIES, type BudgetCategoryDto } from '@bills/contracts';
import type { BudgetExpenseReadModel } from './budget.ports';
import { normalizeCategoryKey } from '../domain/category-key';

const isIncomeLabel = (label: string) => {
  const key = normalizeCategoryKey(label);
  return key.includes('ingreso') || key.includes('recibida') || key.includes('transfer income');
};

export class ListBudgetCategories {
  constructor(private readonly expenses: BudgetExpenseReadModel) {}

  async execute(workspaceId: string): Promise<BudgetCategoryDto[]> {
    const labels = [...COMMON_EXPENSE_CATEGORIES, ...await this.expenses.listCategoryLabels(workspaceId)];
    const categories = new Map<string, string>();
    for (const label of labels) {
      if (isIncomeLabel(label)) continue;
      const key = normalizeCategoryKey(label);
      if (key && !categories.has(key)) categories.set(key, label.trim());
    }
    return [...categories].map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
}
