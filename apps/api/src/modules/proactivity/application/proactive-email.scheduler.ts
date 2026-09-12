import type { ProactiveBudgetReader, ProactiveEmailRepository, ProactivePaydayReader, ProactiveRecurringReader } from './proactive.ports';
import { WeeklyEmailBuilder } from './weekly-email.builder';
import { ProactiveEmailService } from './proactive-email.service';
import { digestCycleKey, localDateString, nextDigestAt, validTimeZone } from '../domain/email-schedule';
import { renderImminentBillEmail, renderPacingWarningEmail, renderPaydayEmail, renderPriceHikeEmail } from '../domain/critical-alert-template';
import { logger } from '../../../shared/observability/logger';

export interface ProactiveEmailFlags {
  weekly: boolean; imminentBill: boolean; priceHike: boolean; pacingWarning: boolean; paydayRitual: boolean;
}

const dayNumber = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

export class ProactiveEmailScheduler {
  constructor(
    private readonly repository: ProactiveEmailRepository,
    private readonly recurring: ProactiveRecurringReader,
    private readonly budgets: ProactiveBudgetReader,
    private readonly payday: ProactivePaydayReader,
    private readonly weeklyBuilder: WeeklyEmailBuilder,
    private readonly service: ProactiveEmailService,
    private readonly flags: ProactiveEmailFlags,
    private readonly appUrl: string,
  ) {}

  async scheduleDue(now = new Date(), deadlineAt = Number.POSITIVE_INFINITY) {
    const weekly = this.flags.weekly ? await this.scheduleWeekly(now, deadlineAt) : { scheduled: 0, skipped: 0 };
    const alertsEnabled = this.flags.imminentBill || this.flags.priceHike || this.flags.pacingWarning || this.flags.paydayRitual;
    const alerts = alertsEnabled && Date.now() < deadlineAt ? await this.scheduleAlerts(now, deadlineAt) : 0;
    return { emailScheduled: weekly.scheduled + alerts, emailSkippedStale: weekly.skipped };
  }

  private async scheduleWeekly(now: Date, deadlineAt: number) {
    const due = await this.repository.dueWeekly(now, 50);
    let scheduled = 0; let skipped = 0;
    for (const member of due) {
      if (Date.now() >= deadlineAt) break;
      const scheduledAt = member.nextWeeklyDigestAt;
      if (!scheduledAt) continue;
      const timeZone = validTimeZone(member.timezone) ? member.timezone : 'America/Santo_Domingo';
      if (now.getTime() - scheduledAt.getTime() > 12 * 3_600_000) {
        await this.repository.advanceWeekly(member.workspaceId, member.profileId, nextDigestAt(now, timeZone, member.digestSchedule));
        skipped++; continue;
      }
      try {
        const unsubscribeUrl = this.service.unsubscribeUrl(member.workspaceId, member.profileId, 'WEEKLY_DIGEST');
        const content = await this.weeklyBuilder.build({
          workspaceId: member.workspaceId, profileId: member.profileId, recipient: member.email,
          displayName: member.displayName, currency: member.defaultCurrency === 'USD' ? 'USD' : 'DOP',
          scheduledAt, timeZone, appUrl: this.appUrl, unsubscribeUrl,
        });
        const delivery = await this.repository.enqueue({
          workspaceId: member.workspaceId, profileId: member.profileId, kind: 'WEEKLY_DIGEST',
          recipient: member.email, contextKey: digestCycleKey(scheduledAt, member.digestSchedule, timeZone),
          ...content, headers: this.service.unsubscribeHeaders(unsubscribeUrl),
        });
        await this.repository.advanceWeekly(member.workspaceId, member.profileId,
          nextDigestAt(new Date(scheduledAt.getTime() + 60_000), timeZone, member.digestSchedule));
        if (delivery.created) scheduled++;
      } catch (error) {
        logger.error('weekly_email_schedule_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError', workspaceId: member.workspaceId,
        });
      }
    }
    return { scheduled, skipped };
  }

  private async scheduleAlerts(now: Date, deadlineAt: number) {
    const audiences = await this.repository.alertAudiences(100);
    let scheduled = 0;
    for (const member of audiences) {
      if (Date.now() >= deadlineAt) break;
      const timeZone = validTimeZone(member.timezone) ? member.timezone : 'America/Santo_Domingo';
      const today = localDateString(now, timeZone);
      try {
        const radars = this.flags.imminentBill || this.flags.priceHike ? await Promise.all([
          this.recurring.radar(member.workspaceId, 'DOP', 3),
          this.recurring.radar(member.workspaceId, 'USD', 3),
        ]) : [];
        if (this.flags.imminentBill) for (const bill of radars.flatMap((radar) => radar.upcoming)) {
          const threshold = bill.currency === 'USD' ? 50 : 3_000;
          const days = dayNumber(bill.nextExpectedDate) - dayNumber(today);
          if (bill.status !== 'CONFIRMED' || bill.monthStatus === 'PAID' || bill.expectedAmount < threshold || days < 1 || days > 2) continue;
          const unsubscribeUrl = this.service.unsubscribeUrl(member.workspaceId, member.profileId, 'CRITICAL_ALERTS');
          const content = renderImminentBillEmail({
            displayName: bill.displayName, amount: bill.expectedAmount, currency: bill.currency,
            dueDate: bill.nextExpectedDate, userDisplayName: member.displayName || undefined,
            appUrl: `${this.appUrl}/app/recurring`, unsubscribeUrl,
          });
          const delivery = await this.repository.enqueue({
            workspaceId: member.workspaceId, profileId: member.profileId, kind: 'IMMINENT_BILL',
            recipient: member.email, contextKey: `${bill.id}:${bill.nextExpectedDate}`,
            ...content, headers: this.service.unsubscribeHeaders(unsubscribeUrl),
          });
          if (delivery.created) scheduled++;
        }
        if (this.flags.priceHike) for (const bill of radars.flatMap((radar) => radar.attention)) {
          const alert = bill.alerts.find((item) => item.kind === 'PRICE_HIKE' && item.baselineAmount && item.observedAmount);
          if (!alert?.baselineAmount || !alert.observedAmount) continue;
          const unsubscribeUrl = this.service.unsubscribeUrl(member.workspaceId, member.profileId, 'CRITICAL_ALERTS');
          const content = renderPriceHikeEmail({ merchant: bill.displayName, baseline: alert.baselineAmount,
            observed: alert.observedAmount, currency: bill.currency, userDisplayName: member.displayName || undefined,
            appUrl: `${this.appUrl}/app/recurring`, unsubscribeUrl });
          const delivery = await this.repository.enqueue({ workspaceId: member.workspaceId, profileId: member.profileId, kind: 'PRICE_HIKE',
            recipient: member.email, contextKey: alert.id, ...content, headers: this.service.unsubscribeHeaders(unsubscribeUrl) });
          if (delivery.created) scheduled++;
        }
        if (this.flags.pacingWarning) scheduled += await this.schedulePacing(member, today);
        if (this.flags.paydayRitual) scheduled += await this.schedulePayday(member, now, today);
      } catch (error) {
        logger.error('imminent_email_schedule_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError', workspaceId: member.workspaceId,
        });
      }
      await this.repository.markAlertsEvaluated(member.workspaceId, member.profileId, now).catch((error) => {
        logger.error('email_alert_scan_checkpoint_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError', workspaceId: member.workspaceId,
        });
      });
    }
    return scheduled;
  }

  private async schedulePacing(member: Awaited<ReturnType<ProactiveEmailRepository['alertAudiences']>>[number], today: string) {
    const currency = member.defaultCurrency === 'USD' ? 'USD' : 'DOP';
    const budget = await this.budgets.getMonthlyBudget(member.workspaceId, today.slice(0, 7), currency);
    let scheduled = 0;
    for (const category of budget.categories) {
      if (!category.categoryKey || category.percentUsed < 85 || Number(today.slice(8, 10)) >= 20) continue;
      const unsubscribeUrl = this.service.unsubscribeUrl(member.workspaceId, member.profileId, 'CRITICAL_ALERTS');
      const content = renderPacingWarningEmail({ category: category.categoryLabel || category.categoryKey,
        percentUsed: category.percentUsed, spent: category.spent, limit: category.limit, currency,
        userDisplayName: member.displayName || undefined, appUrl: `${this.appUrl}/app/budgets`, unsubscribeUrl });
      const delivery = await this.repository.enqueue({ workspaceId: member.workspaceId, profileId: member.profileId, kind: 'PACING_WARNING',
        recipient: member.email, contextKey: `${category.categoryKey}:${today.slice(0, 7)}`,
        ...content, headers: this.service.unsubscribeHeaders(unsubscribeUrl) });
      if (delivery.created) scheduled++;
    }
    return scheduled;
  }

  private async schedulePayday(member: Awaited<ReturnType<ProactiveEmailRepository['alertAudiences']>>[number], now: Date, today: string) {
    const currency = member.defaultCurrency === 'USD' ? 'USD' : 'DOP';
    const ritual = await this.payday.current(member.workspaceId, member.profileId, currency, now);
    if (!ritual.eligible || !ritual.cycleKey || ritual.cycleStart !== today) return 0;
    const unsubscribeUrl = this.service.unsubscribeUrl(member.workspaceId, member.profileId, 'CRITICAL_ALERTS');
    const content = renderPaydayEmail({ available: ritual.available, dailyAvailable: ritual.dailyAvailable,
      futureFixed: ritual.futureFixed, currency, userDisplayName: member.displayName || undefined,
      appUrl: `${this.appUrl}/app/payday`, unsubscribeUrl });
    const delivery = await this.repository.enqueue({ workspaceId: member.workspaceId, profileId: member.profileId, kind: 'PAYDAY_RITUAL',
      recipient: member.email, contextKey: ritual.cycleKey, ...content, headers: this.service.unsubscribeHeaders(unsubscribeUrl) });
    return delivery.created ? 1 : 0;
  }
}
