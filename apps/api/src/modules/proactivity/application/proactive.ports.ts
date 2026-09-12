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

export interface ProactiveEmailTransport {
  sendEmail(options: {
    recipient: string; subject: string; html: string; text: string;
    headers?: Record<string, string>; idempotencyKey: string;
  }): Promise<{
    accepted: boolean;
    providerMessageId: string;
    mode: 'SMTP' | 'AUDIT_LOG';
  }>;
}

export interface EmailPreferenceRecord {
  workspaceId: string; profileId: string; email: string; displayName: string | null;
  timezone: string; defaultCurrency: string; weeklyDigestEnabled: boolean;
  criticalAlertsEnabled: boolean; digestSchedule: 'MONDAY_0730' | 'SUNDAY_1800';
  nextWeeklyDigestAt: Date | null;
}

export interface EmailDeliveryRecord {
  id: string; workspaceId: string; profileId: string; kind: string; recipient: string;
  subject: string; html: string | null; text: string | null; headers: Record<string, string> | null;
  attempts: number; maxAttempts: number; createdAt: Date; leaseToken: string | null;
}

export interface ProactiveEmailRepository {
  getPreferences(workspaceId: string, profileId: string): Promise<EmailPreferenceRecord>;
  updatePreferences(input: {
    workspaceId: string; profileId: string; weeklyDigestEnabled: boolean;
    criticalAlertsEnabled: boolean; digestSchedule: 'MONDAY_0730' | 'SUNDAY_1800';
    nextWeeklyDigestAt: Date | null;
  }): Promise<EmailPreferenceRecord>;
  disableCategory(workspaceId: string, profileId: string, category: 'WEEKLY_DIGEST' | 'CRITICAL_ALERTS'): Promise<boolean>;
  dueWeekly(now: Date, limit: number): Promise<EmailPreferenceRecord[]>;
  alertAudiences(limit: number): Promise<EmailPreferenceRecord[]>;
  markAlertsEvaluated(workspaceId: string, profileId: string, at: Date): Promise<void>;
  advanceWeekly(workspaceId: string, profileId: string, next: Date): Promise<void>;
  enqueue(input: {
    workspaceId: string; profileId: string; kind: string; recipient: string; contextKey: string;
    subject: string; html: string; text: string; headers: Record<string, string>;
  }): Promise<{ id: string; created: boolean }>;
  claim(id?: string): Promise<EmailDeliveryRecord | null>;
  accepted(job: EmailDeliveryRecord, providerMessageId: string): Promise<void>;
  failed(job: EmailDeliveryRecord, error: { code: string; retryable: boolean; ambiguous: boolean }, now: Date): Promise<void>;
  testCount(profileId: string, since: Date): Promise<number>;
  recordProviderEvent(input: { providerEventId: string; providerMessageId: string; type: string; occurredAt: Date }): Promise<boolean>;
  prunePayloads(before: Date): Promise<number>;
}

export interface ProactivePaydayReader {
  current(workspaceId: string, profileId: string, currency: 'DOP' | 'USD', now?: Date): Promise<{
    eligible: boolean; cycleKey: string | null; cycleStart: string | null;
    available: number; dailyAvailable: number; futureFixed: number; currency: 'DOP' | 'USD';
  }>;
}

