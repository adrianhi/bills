import type { ReplaceMonthlyBudgetInput } from '@bills/contracts';
import type { BudgetLimitWrite, BudgetRepository } from './budget.ports';
import { BudgetApplicationError } from './budget-error';
import { ListBudgetCategories } from './list-budget-categories';
import { categoryTargetKey } from '../domain/category-key';
import { monthDate, santoDomingoMonth } from '../domain/budget-month';
import { resolveBudgetLimits } from '../domain/budget-resolution';
import type { GetMonthlyBudget } from './get-monthly-budget';

export class ReplaceMonthlyBudget {
  constructor(
    private readonly budgets: BudgetRepository,
    private readonly categories: ListBudgetCategories,
    private readonly summary: GetMonthlyBudget,
  ) {}

  async execute(workspaceId: string, input: ReplaceMonthlyBudgetInput) {
    if (input.propagation === 'CURRENT_AND_FUTURE' && input.month < santoDomingoMonth()) {
      throw new BudgetApplicationError(400, 'BUDGET_PAST_RECURRENCE_FORBIDDEN', 'Los meses anteriores solo pueden editarse de forma individual.');
    }
    const available = new Map((await this.categories.execute(workspaceId)).map((item) => [item.key, item.label]));
    for (const item of input.categories) {
      if (!available.has(item.categoryKey)) {
        throw new BudgetApplicationError(400, 'BUDGET_CATEGORY_UNAVAILABLE', `La categoría ${item.categoryKey} no está disponible.`);
      }
    }
    const month = monthDate(input.month);
    const current = resolveBudgetLimits(await this.budgets.listThroughMonth(workspaceId, input.currency, month), month);
    const desired: BudgetLimitWrite[] = [];
    if (input.globalLimit !== null) desired.push({
      targetKey: 'global', categoryKey: null, categoryLabel: null, scope: 'GLOBAL', amount: input.globalLimit, disabled: false,
    });
    input.categories.forEach((item) => desired.push({
      targetKey: categoryTargetKey(item.categoryKey), categoryKey: item.categoryKey,
      categoryLabel: available.get(item.categoryKey)!, scope: 'CATEGORY', amount: item.amount, disabled: false,
    }));
    const desiredKeys = new Set(desired.map((item) => item.targetKey));
    current.filter((item) => !desiredKeys.has(item.targetKey)).forEach((item) => desired.push({
      targetKey: item.targetKey, categoryKey: item.categoryKey, categoryLabel: item.categoryLabel,
      scope: item.scope, amount: null, disabled: true,
    }));
    await this.budgets.replaceVersion({
      workspaceId, currency: input.currency, month,
      kind: input.propagation === 'CURRENT_MONTH' ? 'MONTH_OVERRIDE' : 'RECURRING',
      limits: desired, clearMonthOverrides: input.propagation === 'CURRENT_AND_FUTURE',
    });
    return this.summary.execute(workspaceId, input.month, input.currency);
  }
}
