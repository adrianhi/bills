import { COMMON_EXPENSE_CATEGORIES } from '@bills/contracts';
import { normalizeLabel, isIncomeCategory } from '../../../shared/domain/normalize-label';
import type { ExpenseCategoryCatalog, RuleCatalogSource } from './rule.ports';

export class ListExpenseCategories implements ExpenseCategoryCatalog {
  constructor(private readonly source: RuleCatalogSource) {}
  async list(workspaceId: string) {
    const categories = new Map<string, string>();
    for (const label of [...COMMON_EXPENSE_CATEGORIES, ...await this.source.categoryLabels(workspaceId)]) {
      const key = normalizeLabel(label);
      if (key && !isIncomeCategory(label) && !categories.has(key)) categories.set(key, label.trim());
    }
    return [...categories].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
}
