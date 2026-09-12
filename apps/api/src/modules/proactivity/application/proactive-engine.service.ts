import type {
  ProactiveFeedDto,
  SendWeeklyDigestTestResponse,
  SimulateExpenseResultDto,
  WeeklyCheckinDto,
  WeeklyDigestPreviewDto,
} from '@bills/contracts';
import { evaluateProactiveFeed } from '../domain/proactive-rules';
import { computeWeeklyCheckin, resolveWeekPeriod } from '../domain/weekly-checkin';
import { simulateExpenseImpact } from '../domain/expense-simulator';
import { renderWeeklyDigestHtml } from '../domain/weekly-digest-template';
import type {
  ProactiveBudgetReader,
  ProactiveDismissalRepository,
  ProactiveEmailTransport,
  ProactiveRecurringReader,
  ProactiveSafeToSpendReader,
  ProactiveTransactionReader,
  ProactiveWeeklyExpenseReader,
  ProactiveWeeklyReviewRepository,
} from './proactive.ports';

function santoDomingoDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function calculateMonthDaysRemaining(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.max(0, lastDay - day);
}

export class ProactiveEngineService {
  constructor(
    private readonly recurring: ProactiveRecurringReader,
    private readonly budgets: ProactiveBudgetReader,
    private readonly safeToSpend: ProactiveSafeToSpendReader,
    private readonly transactions: ProactiveTransactionReader,
    private readonly dismissals: ProactiveDismissalRepository,
    private readonly weeklyReviews: ProactiveWeeklyReviewRepository,
    private readonly weeklyExpenses: ProactiveWeeklyExpenseReader,
    private readonly emailTransport?: ProactiveEmailTransport,
  ) {}


  async getFeed(
    workspaceId: string,
    profileId: string,
    currency: 'DOP' | 'USD',
    now = new Date()
  ): Promise<ProactiveFeedDto> {
    const today = santoDomingoDate(now);
    const [year, monthNum, day] = today.split('-').map(Number);
    const month = today.slice(0, 7);
    const monthDaysRemaining = calculateMonthDaysRemaining(year, monthNum, day);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

    const [radar, budgetSummary, safeToSpendVal, unclassified, dismissedIds, weeklyCheckin] = await Promise.all([
      this.recurring.radar(workspaceId, currency, 30).catch(() => null),
      this.budgets.getMonthlyBudget(workspaceId, month, currency).catch(() => null),
      this.safeToSpend.getSafeToSpend(workspaceId, currency).catch(() => null),
      this.transactions.findUnclassified(workspaceId, currency, 20, fourteenDaysAgo).catch(() => []),
      this.dismissals.listDismissed(workspaceId, profileId, fourteenDaysAgo).catch(() => []),
      this.getWeeklyCheckin(workspaceId, profileId, currency, now).catch(() => null),
    ]);

    const evaluated = evaluateProactiveFeed({
      currency,
      today,
      month,
      monthDaysRemaining,
      recurringBills: radar?.upcoming || [],
      recurringAttention: radar?.attention || [],
      budgetSummary,
      safeToSpend: safeToSpendVal,
      unclassifiedTransactions: unclassified,
      weeklyCheckin,
      dismissedActionIds: new Set(dismissedIds),
    });

    return {
      currency,
      generatedAt: now.toISOString(),
      actions: evaluated.actions,
      counts: evaluated.counts,
    };
  }

  async getWeeklyCheckin(
    workspaceId: string,
    profileId: string,
    currency: 'DOP' | 'USD',
    now = new Date()
  ): Promise<WeeklyCheckinDto> {
    const period = resolveWeekPeriod(now);
    const [completedAt, currentWeekTx, prevWeekTx, safeToSpendVal] = await Promise.all([
      this.weeklyReviews.completedAt(workspaceId, profileId, period.weekKey).catch(() => null),
      this.weeklyExpenses.listBetween(workspaceId, currency, period.currentStart, period.currentEnd).catch(() => []),
      this.weeklyExpenses.listBetween(workspaceId, currency, period.previousStart, period.previousEnd).catch(() => []),
      this.safeToSpend.getSafeToSpend(workspaceId, currency).catch(() => null),
    ]);

    return computeWeeklyCheckin({
      currency,
      weekKey: period.weekKey,
      startDate: period.startDateStr,
      endDate: period.endDateStr,
      currentWeekTransactions: currentWeekTx,
      previousWeekTransactions: prevWeekTx,
      daysToNextPayday: period.daysToNextPayday,
      dailyAllowance: safeToSpendVal?.dailyAllowance || 0,
      completedAt: completedAt ? completedAt.toISOString() : null,
    });
  }

  async completeWeeklyCheckin(
    workspaceId: string,
    profileId: string,
    weekKey: string,
    currency: 'DOP' | 'USD'
  ): Promise<WeeklyCheckinDto> {
    await this.weeklyReviews.complete(workspaceId, profileId, weekKey);
    return this.getWeeklyCheckin(workspaceId, profileId, currency);
  }

  async dismissAction(workspaceId: string, profileId: string, actionId: string): Promise<void> {
    await this.dismissals.dismiss(workspaceId, profileId, actionId);
  }

  async simulateExpense(
    workspaceId: string,
    input: { amount: number; categoryKey?: string; currency: 'DOP' | 'USD' },
    now = new Date()
  ): Promise<SimulateExpenseResultDto> {
    const today = santoDomingoDate(now);
    const month = today.slice(0, 7);
    const [safe, budgetSummary] = await Promise.all([
      this.safeToSpend.getSafeToSpend(workspaceId, input.currency).catch(() => null),
      this.budgets.getMonthlyBudget(workspaceId, month, input.currency).catch(() => null),
    ]);

    return simulateExpenseImpact({
      amount: input.amount,
      categoryKey: input.categoryKey,
      currency: input.currency,
      safeToSpend: safe,
      budgetSummary,
    });
  }

  async getWeeklyDigestPreview(
    workspaceId: string,
    profileId: string,
    recipientEmail: string,
    displayName: string,
    currency: 'DOP' | 'USD',
    appUrl?: string,
    now = new Date()
  ): Promise<WeeklyDigestPreviewDto> {
    const [checkin, radar] = await Promise.all([
      this.getWeeklyCheckin(workspaceId, profileId, currency, now),
      this.recurring.radar(workspaceId, currency, 7).catch(() => null),
    ]);

    const rendered = renderWeeklyDigestHtml({
      checkin,
      upcomingBills: radar?.upcoming || [],
      userDisplayName: displayName,
      appUrl,
    });

    return {
      subject: rendered.subject,
      recipient: recipientEmail,
      weekKey: checkin.weekKey,
      html: rendered.html,
      generatedAt: now.toISOString(),
    };
  }

  async sendWeeklyDigestTest(
    workspaceId: string,
    profileId: string,
    recipientEmail: string,
    displayName: string,
    currency: 'DOP' | 'USD',
    appUrl?: string,
    now = new Date()
  ): Promise<SendWeeklyDigestTestResponse['data']> {
    const preview = await this.getWeeklyDigestPreview(
      workspaceId,
      profileId,
      recipientEmail,
      displayName,
      currency,
      appUrl,
      now
    );

    if (this.emailTransport) {
      return this.emailTransport.sendEmail({
        recipient: preview.recipient,
        subject: preview.subject,
        html: preview.html,
      });
    }

    return {
      delivered: true,
      recipient: preview.recipient,
      subject: preview.subject,
      mode: 'AUDIT_LOG',
    };
  }
}

