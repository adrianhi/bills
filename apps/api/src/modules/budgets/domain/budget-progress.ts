import type { BudgetProgressDto, BudgetSummaryDto } from '@bills/contracts';
import { elapsedMonthDays } from './budget-month';
import type { ResolvedBudgetLimit } from './budget-resolution';

export interface ExpenseAggregate {
  categoryKey: string;
  approved: number;
  pending: number;
  approvedCount: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

function progress(limit: ResolvedBudgetLimit, spent: number, pending: number, count: number, month: string, now: Date): BudgetProgressDto {
  const calendar = elapsedMonthDays(month, now);
  const percentUsed = limit.amount > 0 ? round(spent / limit.amount * 100) : 0;
  const projected = calendar.current && calendar.elapsedDays >= 5 && count >= 3
    ? round(spent / calendar.elapsedDays * calendar.daysInMonth)
    : null;
  const status = spent > limit.amount ? 'EXCEEDED'
    : calendar.current && percentUsed >= 90 ? 'NEAR_LIMIT'
      : projected !== null && projected > limit.amount * 1.1 ? 'PACE_WARNING'
        : 'ON_TRACK';
  return {
    scope: limit.scope, categoryKey: limit.categoryKey, categoryLabel: limit.categoryLabel,
    limit: round(limit.amount), spent: round(spent), pending: round(pending),
    remaining: round(Math.max(limit.amount - spent, 0)), exceededBy: round(Math.max(spent - limit.amount, 0)),
    percentUsed, projected, status,
  };
}

export function buildBudgetSummary(input: {
  month: string; currency: 'DOP' | 'USD'; limits: ResolvedBudgetLimit[];
  expenses: ExpenseAggregate[]; now?: Date;
}): BudgetSummaryDto {
  const now = input.now ?? new Date();
  const totalSpent = input.expenses.reduce((sum, item) => sum + item.approved, 0);
  const totalPending = input.expenses.reduce((sum, item) => sum + item.pending, 0);
  const totalCount = input.expenses.reduce((sum, item) => sum + item.approvedCount, 0);
  const expenseMap = new Map(input.expenses.map((item) => [item.categoryKey, item]));
  const globalLimit = input.limits.find((item) => item.scope === 'GLOBAL');
  const global = globalLimit ? progress(globalLimit, totalSpent, totalPending, totalCount, input.month, now) : null;
  const categories = input.limits.filter((item) => item.scope === 'CATEGORY').map((limit) => {
    const expense = expenseMap.get(limit.categoryKey || '') ?? { approved: 0, pending: 0, approvedCount: 0 };
    return progress(limit, expense.approved, expense.pending, expense.approvedCount, input.month, now);
  });
  const budgetedKeys = new Set(categories.map((item) => item.categoryKey));
  const unbudgetedSpent = input.expenses.filter((item) => !budgetedKeys.has(item.categoryKey)).reduce((sum, item) => sum + item.approved, 0);
  const priority = { EXCEEDED: 3, NEAR_LIMIT: 2, PACE_WARNING: 1, ON_TRACK: 0 } as const;
  const alerts = [...(global ? [global] : []), ...categories]
    .filter((item) => item.status !== 'ON_TRACK')
    .sort((a, b) => priority[b.status] - priority[a.status] || b.percentUsed - a.percentUsed)
    .slice(0, 3);
  return {
    month: input.month, currency: input.currency, hasBudget: input.limits.length > 0,
    totalSpent: round(totalSpent), totalPending: round(totalPending), unbudgetedSpent: round(unbudgetedSpent),
    global, categories, alerts,
  };
}
