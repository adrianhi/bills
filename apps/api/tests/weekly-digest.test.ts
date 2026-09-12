import { describe, expect, it } from 'vitest';
import type { RecurringBillDto, WeeklyCheckinDto } from '@bills/contracts';
import { renderWeeklyDigestHtml } from '../src/modules/proactivity/domain/weekly-digest-template';

describe('renderWeeklyDigestHtml', () => {
  const checkin: WeeklyCheckinDto = {
    weekKey: '2026-W37',
    startDate: '2026-09-07',
    endDate: '2026-09-13',
    currency: 'DOP',
    totalSpentThisWeek: 8500,
    totalSpentPreviousWeek: 9500,
    changePercent: -11,
    netDifference: -1000,
    topCategory: { name: 'Supermercado', amount: 5200, percentage: 61 },
    topMerchant: { name: 'Supermercados Bravo', amount: 3800 },
    daysToNextPayday: 3,
    estimatedDailyAllowance: 1200,
    status: 'OPEN',
    completedAt: null,
  };

  const upcomingBills: RecurringBillDto[] = [
    {
      id: 'bill-claro',
      displayName: 'Claro Internet',
      currency: 'DOP',
      cadence: 'MONTHLY',
      expectedAmount: 2199,
      nextExpectedDate: '2026-09-15',
      lastSeenAt: '2026-08-15',
      occurrenceCount: 6,
      confidence: 0.98,
      status: 'CONFIRMED',
      userEdited: false,
      daysRemaining: 3,
      monthStatus: 'UPCOMING',
      alerts: [],
    },
  ];

  it('renders weekly digest email subject and html containing key figures', () => {
    const rendered = renderWeeklyDigestHtml({
      checkin,
      upcomingBills,
      userDisplayName: 'Adrian',
      appUrl: 'https://bills.app',
    });

    expect(rendered.subject).toContain('Tu Pulso Semanal');
    expect(rendered.subject).toContain('2026-09-07');
    expect(rendered.html).toContain('8,500');
    expect(rendered.html).toContain('Supermercado');
    expect(rendered.html).toContain('Claro Internet');
    expect(rendered.html).toContain('2,199');
    expect(rendered.html).toContain('1,200');
    expect(rendered.html).toContain('Adrian');
    expect(rendered.html).toContain('https://bills.app');
  });

  it('handles empty bills gracefully', () => {
    const rendered = renderWeeklyDigestHtml({
      checkin,
      upcomingBills: [],
    });

    expect(rendered.html).toContain('No tienes cobros fijos programados');
  });
});
