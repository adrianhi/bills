import type { BudgetLimitKindName, BudgetLimitRecord, BudgetScopeName } from '../domain/budget-resolution';
import type { ExpenseAggregate } from '../domain/budget-progress';

export interface BudgetLimitWrite {
  targetKey: string;
  categoryKey: string | null;
  categoryLabel: string | null;
  scope: BudgetScopeName;
  amount: number | null;
  disabled: boolean;
}

export interface BudgetRepository {
  listThroughMonth(workspaceId: string, currency: string, month: Date): Promise<BudgetLimitRecord[]>;
  replaceVersion(input: {
    workspaceId: string; currency: string; month: Date; kind: BudgetLimitKindName;
    limits: BudgetLimitWrite[]; clearMonthOverrides: boolean;
  }): Promise<void>;
  exportForWorkspaces(workspaceIds: string[]): Promise<unknown[]>;
}

export interface MonthlyExpenseHistory {
  month: string;
  expenses: ExpenseAggregate[];
}

export interface BudgetExpenseReadModel {
  summarizeMonth(workspaceId: string, currency: string, month: string): Promise<ExpenseAggregate[]>;
  history(workspaceId: string, currency: string, months: string[]): Promise<MonthlyExpenseHistory[]>;
  firstExpenseMonth(workspaceId: string, currency: string): Promise<string | null>;
  listCategoryLabels(workspaceId: string): Promise<string[]>;
}
