import type { BudgetCurrency } from './types';
import type { BudgetExpenseReadModel, BudgetRepository } from './budget.ports';
import { monthDate } from '../domain/budget-month';
import { hasMonthOverride, resolveBudgetLimits } from '../domain/budget-resolution';
import { buildBudgetSummary } from '../domain/budget-progress';

export class GetMonthlyBudget {
  constructor(private readonly budgets: BudgetRepository, private readonly expenses: BudgetExpenseReadModel) {}

  async execute(workspaceId: string, month: string, currency: BudgetCurrency) {
    const monthDt = monthDate(month);
    const [records, expenseSummary] = await Promise.all([
      this.budgets.listThroughMonth(workspaceId, currency, monthDt),
      this.expenses.summarizeMonth(workspaceId, currency, month),
    ]);
    const isOverride = hasMonthOverride(records, monthDt);
    return buildBudgetSummary({
      month,
      currency,
      limits: resolveBudgetLimits(records, monthDt),
      propagation: isOverride ? 'CURRENT_MONTH' : 'CURRENT_AND_FUTURE',
      expenses: expenseSummary,
    });
  }
}
