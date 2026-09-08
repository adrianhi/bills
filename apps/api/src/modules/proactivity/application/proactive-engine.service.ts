import type { ProactiveFeedDto } from '@bills/contracts';
import { evaluateProactiveFeed } from '../domain/proactive-rules';
import type {
  ProactiveBudgetReader,
  ProactiveDismissalRepository,
  ProactiveRecurringReader,
  ProactiveSafeToSpendReader,
  ProactiveTransactionReader,
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

    const [radar, budgetSummary, safeToSpendVal, unclassified, dismissedIds] = await Promise.all([
      this.recurring.radar(workspaceId, currency, 30).catch(() => null),
      this.budgets.getMonthlyBudget(workspaceId, month, currency).catch(() => null),
      this.safeToSpend.getSafeToSpend(workspaceId, currency).catch(() => null),
      this.transactions.findUnclassified(workspaceId, currency, 20, fourteenDaysAgo).catch(() => []),
      this.dismissals.listDismissed(workspaceId, profileId, fourteenDaysAgo).catch(() => []),
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
      dismissedActionIds: new Set(dismissedIds),
    });

    return {
      currency,
      generatedAt: now.toISOString(),
      actions: evaluated.actions,
      counts: evaluated.counts,
    };
  }

  async dismissAction(workspaceId: string, profileId: string, actionId: string): Promise<void> {
    await this.dismissals.dismiss(workspaceId, profileId, actionId);
  }
}
