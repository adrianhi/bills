import { describe, expect, it, vi } from 'vitest';
import { ProactiveEmailScheduler } from '../src/modules/proactivity/application/proactive-email.scheduler';
import type { EmailPreferenceRecord, ProactiveEmailRepository, ProactiveRecurringReader } from '../src/modules/proactivity/application/proactive.ports';
import type { WeeklyEmailBuilder } from '../src/modules/proactivity/application/weekly-email.builder';
import type { ProactiveEmailService } from '../src/modules/proactivity/application/proactive-email.service';

const member: EmailPreferenceRecord = {
  workspaceId: 'workspace', profileId: 'profile', email: 'member@example.com', displayName: 'Member',
  timezone: 'America/Santo_Domingo', defaultCurrency: 'DOP', weeklyDigestEnabled: true,
  criticalAlertsEnabled: true, digestSchedule: 'MONDAY_0730', nextWeeklyDigestAt: new Date('2026-09-14T11:30:00Z'),
};

function repository(overrides: Record<string, unknown> = {}) {
  return {
    dueWeekly: vi.fn(async () => []), alertAudiences: vi.fn(async () => []), enqueue: vi.fn(async () => ({ id: 'delivery', created: true })),
    advanceWeekly: vi.fn(async () => {}), markAlertsEvaluated: vi.fn(async () => {}), ...overrides,
  } as unknown as ProactiveEmailRepository;
}

const service = {
  unsubscribeUrl: vi.fn(() => 'https://api.example/unsubscribe?token=x'),
  unsubscribeHeaders: vi.fn(() => ({ 'List-Unsubscribe': '<https://api.example/unsubscribe?token=x>' })),
} as unknown as ProactiveEmailService;
const builder = { build: vi.fn(async () => ({ subject: 'Digest', html: '<p>Digest</p>', text: 'Digest' })) } as unknown as WeeklyEmailBuilder;

describe('ProactiveEmailScheduler', () => {
  it('counts one delivery when five schedulers race the same weekly cycle', async () => {
    let created = false;
    const repo = repository({
      dueWeekly: vi.fn(async () => [member]),
      enqueue: vi.fn(async () => {
        if (created) return { id: 'delivery', created: false };
        created = true; return { id: 'delivery', created: true };
      }),
    });
    const scheduler = new ProactiveEmailScheduler(repo, {} as ProactiveRecurringReader, {} as never, {} as never, builder, service,
      { weekly: true, imminentBill: false, priceHike: false, pacingWarning: false, paydayRitual: false }, 'https://cuadre.example');
    const results = await Promise.all(Array.from({ length: 5 }, () => scheduler.scheduleDue(new Date('2026-09-14T12:00:00Z'))));
    expect(results.reduce((total, result) => total + result.emailScheduled, 0)).toBe(1);
    expect(repo.enqueue).toHaveBeenCalledTimes(5);
  });

  it('skips digests delayed by more than twelve hours and advances the schedule', async () => {
    const repo = repository({ dueWeekly: vi.fn(async () => [member]) });
    const scheduler = new ProactiveEmailScheduler(repo, {} as ProactiveRecurringReader, {} as never, {} as never, builder, service,
      { weekly: true, imminentBill: false, priceHike: false, pacingWarning: false, paydayRitual: false }, 'https://cuadre.example');
    const result = await scheduler.scheduleDue(new Date('2026-09-15T00:00:01Z'));
    expect(result).toMatchObject({ emailScheduled: 0, emailSkippedStale: 1 });
    expect(repo.advanceWeekly).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.advanceWeekly).mock.calls[0][2].getTime()).toBeGreaterThan(new Date('2026-09-15T00:00:01Z').getTime());
    expect(repo.enqueue).not.toHaveBeenCalled();
  });

  it('only schedules confirmed, unpaid, threshold-qualified bills one or two days away', async () => {
    const base = {
      id: 'eligible', displayName: 'Seguro', currency: 'DOP' as const, cadence: 'MONTHLY' as const,
      expectedAmount: 3000, nextExpectedDate: '2026-09-14', lastSeenAt: '2026-08-14', occurrenceCount: 4,
      confidence: 1, status: 'CONFIRMED' as const, userEdited: false, daysRemaining: 2,
      monthStatus: 'UPCOMING' as const, alerts: [],
    };
    const repo = repository({ alertAudiences: vi.fn(async () => [member]) });
    const recurring = { radar: vi.fn(async (_workspace, currency) => ({
      currency, generatedAt: '', analysisStatus: 'READY', fixedMonthlyBurden: 0, paidThisMonth: 0,
      pendingThisMonth: 0, estimatedMonthlyIncome: 0, freeDiscretionaryCash: 0,
      upcomingWindows: { in7: 0, in14: 0, in30: 0 }, suggestions: [], attention: [], paused: [], allConfirmed: [],
      upcoming: currency === 'USD' ? [
        { ...base, id: 'usd-eligible', currency: 'USD', expectedAmount: 50 },
        { ...base, id: 'usd-small', currency: 'USD', expectedAmount: 49.99 },
      ] : [
        base, { ...base, id: 'small', expectedAmount: 2999 }, { ...base, id: 'suggested', status: 'SUGGESTED' },
        { ...base, id: 'paid', monthStatus: 'PAID' }, { ...base, id: 'today', nextExpectedDate: '2026-09-12' },
      ],
    })) } as unknown as ProactiveRecurringReader;
    const scheduler = new ProactiveEmailScheduler(repo, recurring, {} as never, {} as never, builder, service,
      { weekly: false, imminentBill: true, priceHike: false, pacingWarning: false, paydayRitual: false }, 'https://cuadre.example');
    expect(await scheduler.scheduleDue(new Date('2026-09-12T12:00:00Z'))).toMatchObject({ emailScheduled: 2 });
    expect(repo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'IMMINENT_BILL', contextKey: 'eligible:2026-09-14' }));
    expect(repo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'IMMINENT_BILL', contextKey: 'usd-eligible:2026-09-14' }));
  });

  it('keeps price, pacing and payday rules independently activatable', async () => {
    const repo = repository({ alertAudiences: vi.fn(async () => [member]) });
    const priceBill = {
      id: 'netflix', displayName: 'Netflix', currency: 'DOP', cadence: 'MONTHLY', expectedAmount: 1000,
      nextExpectedDate: '2026-09-30', lastSeenAt: '', occurrenceCount: 3, confidence: 1,
      status: 'CONFIRMED', userEdited: false, daysRemaining: 18, monthStatus: 'UPCOMING',
      alerts: [{ id: 'hike-1', kind: 'PRICE_HIKE', baselineAmount: 900, observedAmount: 1000, createdAt: '' }],
    };
    const recurring = { radar: vi.fn(async (_workspace, currency) => ({
      currency, upcoming: [], attention: currency === 'DOP' ? [priceBill] : [], suggestions: [], paused: [], allConfirmed: [],
      upcomingWindows: { in7: 0, in14: 0, in30: 0 }, generatedAt: '', analysisStatus: 'READY',
      fixedMonthlyBurden: 0, paidThisMonth: 0, pendingThisMonth: 0, estimatedMonthlyIncome: 0, freeDiscretionaryCash: 0,
    })) } as unknown as ProactiveRecurringReader;
    const budgets = { getMonthlyBudget: vi.fn(async () => ({
      month: '2026-09', currency: 'DOP', hasBudget: true, propagation: 'CURRENT_AND_FUTURE', totalSpent: 0,
      totalPending: 0, unbudgetedSpent: 0, global: null, alerts: [], categories: [{ scope: 'CATEGORY',
        categoryKey: 'delivery', categoryLabel: 'Delivery', limit: 10000, spent: 8600, pending: 0,
        remaining: 1400, exceededBy: 0, percentUsed: 86, projected: 11000, status: 'PACE_WARNING' }],
    })) };
    const payday = { current: vi.fn(async () => ({ eligible: true, cycleKey: '2026-09-15', cycleStart: '2026-09-15',
      available: 15000, dailyAvailable: 1000, futureFixed: 5000, currency: 'DOP' })) };
    const scheduler = new ProactiveEmailScheduler(repo, recurring, budgets as never, payday as never, builder, service,
      { weekly: false, imminentBill: false, priceHike: true, pacingWarning: true, paydayRitual: true }, 'https://cuadre.example');
    expect(await scheduler.scheduleDue(new Date('2026-09-15T12:00:00Z'))).toMatchObject({ emailScheduled: 3 });
    expect(vi.mocked(repo.enqueue).mock.calls.map(([value]) => value.kind)).toEqual(['PRICE_HIKE', 'PACING_WARNING', 'PAYDAY_RITUAL']);
  });
});
