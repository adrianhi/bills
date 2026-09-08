import type { ProactiveFeedDto, WeeklyCheckinDto } from '@bills/contracts';
import { evaluateProactiveFeed } from '../domain/proactive-rules';
import { computeWeeklyCheckin, resolveWeekPeriod } from '../domain/weekly-checkin';
import type {
  ProactiveBudgetReader,
  ProactiveDismissalRepository,
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
}
