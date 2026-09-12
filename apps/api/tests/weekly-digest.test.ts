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
    expect(rendered.html).toContain('>C.</div>');
    expect(rendered.html).not.toContain('cifrado de extremo a extremo');
    expect(rendered.text).toContain('Gasto de los últimos 7 días');
  });

  it('handles empty bills gracefully', () => {
    const rendered = renderWeeklyDigestHtml({
      checkin,
      upcomingBills: [],
    });

    expect(rendered.html).toContain('No tienes cobros fijos programados');
  });

  it('escapes all user-controlled values', () => {
    const rendered = renderWeeklyDigestHtml({
      checkin: { ...checkin, topCategory: { name: '<script>alert(1)</script>', amount: 10, percentage: 1 } },
      upcomingBills: [{ ...upcomingBills[0], displayName: '<img src=x onerror=alert(1)>' }],
      userDisplayName: '<b>Adrian</b>', unsubscribeUrl: 'https://api.example/unsubscribe?a=1&b=2',
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).not.toContain('<img src=x');
    expect(rendered.html).not.toContain('<b>Adrian</b>');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.html).toContain('a=1&amp;b=2');
  });
});
