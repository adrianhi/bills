import type {
  BudgetSummaryDto,
  RecurringRadarDto,
  SafeToSpendDto,
  TransactionDto,
} from '@bills/contracts';

export interface ProactiveRecurringReader {
  radar(workspaceId: string, currency: 'DOP' | 'USD', window: number): Promise<RecurringRadarDto>;
}

export interface ProactiveBudgetReader {
  getMonthlyBudget(workspaceId: string, month: string, currency: 'DOP' | 'USD'): Promise<BudgetSummaryDto>;
}

export interface ProactiveSafeToSpendReader {
  getSafeToSpend(workspaceId: string, currency: 'DOP' | 'USD'): Promise<SafeToSpendDto>;
}

export interface ProactiveTransactionReader {
  findUnclassified(workspaceId: string, currency: string, limit: number, since: Date): Promise<TransactionDto[]>;
}

export interface ProactiveDismissalRepository {
  listDismissed(workspaceId: string, profileId: string, since: Date): Promise<string[]>;
  dismiss(workspaceId: string, profileId: string, actionId: string): Promise<void>;
}

export interface ProactiveWeeklyReviewRepository {
  completedAt(workspaceId: string, profileId: string, weekKey: string): Promise<Date | null>;
  complete(workspaceId: string, profileId: string, weekKey: string): Promise<void>;
}

export interface ProactiveWeeklyExpenseReader {
  listBetween(workspaceId: string, currency: string, from: Date, to: Date): Promise<TransactionDto[]>;
}
