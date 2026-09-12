import { computeWeeklyCheckin } from '../domain/weekly-checkin';
import { localDateString, rollingDigestWindow } from '../domain/email-schedule';
import { renderWeeklyDigestHtml } from '../domain/weekly-digest-template';
import type {
  ProactiveRecurringReader, ProactiveSafeToSpendReader, ProactiveWeeklyExpenseReader,
} from './proactive.ports';

function daysToNextPayday(date: Date, timeZone: string) {
  const local = localDateString(date, timeZone);
  const [year, month, day] = local.split('-').map(Number);
  const end = Math.min(30, new Date(Date.UTC(year, month, 0)).getUTCDate());
  if (day < 15) return 15 - day;
  if (day < end) return end - day;
  return 0;
}

export class WeeklyEmailBuilder {
  constructor(
    private readonly recurring: ProactiveRecurringReader,
    private readonly safeToSpend: ProactiveSafeToSpendReader,
    private readonly expenses: ProactiveWeeklyExpenseReader,
  ) {}

  async build(input: {
    workspaceId: string; profileId: string; recipient: string; displayName: string | null;
    currency: 'DOP' | 'USD'; scheduledAt: Date; timeZone: string; appUrl: string; unsubscribeUrl?: string;
  }) {
    const period = rollingDigestWindow(input.scheduledAt, input.timeZone);
    const [current, previous, safe, radar] = await Promise.all([
      this.expenses.listBetween(input.workspaceId, input.currency, period.currentStart, period.currentEnd),
      this.expenses.listBetween(input.workspaceId, input.currency, period.previousStart, period.previousEnd),
      this.safeToSpend.getSafeToSpend(input.workspaceId, input.currency).catch(() => null),
      this.recurring.radar(input.workspaceId, input.currency, 7).catch(() => null),
    ]);
    const checkin = computeWeeklyCheckin({
      currency: input.currency, weekKey: `rolling:${input.scheduledAt.toISOString()}`,
      startDate: localDateString(period.currentStart, input.timeZone),
      endDate: localDateString(period.currentEnd, input.timeZone),
      currentWeekTransactions: current, previousWeekTransactions: previous,
      daysToNextPayday: daysToNextPayday(input.scheduledAt, input.timeZone),
      dailyAllowance: safe?.dailyAllowance || 0, completedAt: null,
    });
    return renderWeeklyDigestHtml({
      checkin, upcomingBills: radar?.upcoming || [], userDisplayName: input.displayName || undefined,
      appUrl: input.appUrl, unsubscribeUrl: input.unsubscribeUrl,
    });
  }
}
