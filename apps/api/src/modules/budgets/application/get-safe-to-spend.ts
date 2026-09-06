import type { BudgetRepository } from './budget.ports';
import type { ConfirmedCommitmentReader, SafeToSpendExpenseReader } from './safe-to-spend.ports';
import { calculateSafeToSpend } from '../domain/safe-to-spend';
import { monthDate, santoDomingoDateParts } from '../domain/budget-month';
import { resolveBudgetLimits } from '../domain/budget-resolution';

export class GetSafeToSpend {
  constructor(
    private readonly budgets: BudgetRepository,
    private readonly expenses: SafeToSpendExpenseReader,
    private readonly commitments: ConfirmedCommitmentReader,
  ) {}

  async execute(workspaceId: string, currency: 'DOP' | 'USD', now = new Date()) {
    const calendar = santoDomingoDateParts(now);
    const [records, spending, futureConfirmedCommitments] = await Promise.all([
      this.budgets.listThroughMonth(workspaceId, currency, monthDate(calendar.month)),
      this.expenses.summarize(workspaceId, currency, calendar.date),
      this.commitments.sumFutureThroughMonthEnd(workspaceId, currency, calendar.date),
    ]);
    const global = resolveBudgetLimits(records, monthDate(calendar.month))
      .find((item) => item.scope === 'GLOBAL');
    return calculateSafeToSpend({
      ...calendar, currency, globalLimit: global?.amount ?? null,
      ...spending, futureConfirmedCommitments,
    });
  }
}
