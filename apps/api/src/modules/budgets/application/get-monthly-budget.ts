import type { BudgetCurrency } from './types';
import type { BudgetExpenseReadModel, BudgetRepository } from './budget.ports';
import { monthDate } from '../domain/budget-month';
import { resolveBudgetLimits } from '../domain/budget-resolution';
import { buildBudgetSummary } from '../domain/budget-progress';

export class GetMonthlyBudget {
  constructor(private readonly budgets: BudgetRepository, private readonly expenses: BudgetExpenseReadModel) {}

  async execute(workspaceId: string, month: string, currency: BudgetCurrency) {
    const [records, expenseSummary] = await Promise.all([
      this.budgets.listThroughMonth(workspaceId, currency, monthDate(month)),
      this.expenses.summarizeMonth(workspaceId, currency, month),
    ]);
    return buildBudgetSummary({
      month, currency, limits: resolveBudgetLimits(records, monthDate(month)), expenses: expenseSummary,
    });
  }
}
