import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { httpClient } from '@/shared/api';
import { proactiveService } from './proactive.service';

const mock = new AxiosMockAdapter(httpClient);

const sampleFeed = {
  currency: 'DOP',
  generatedAt: '2026-09-08T19:00:00.000Z',
  actions: [
    {
      id: 'imminent-bill-1',
      kind: 'IMMINENT_BILL',
      priority: 'HIGH',
      title: 'Cobro próximo: Claro Internet',
      description: 'Vence en 2 días por DOP 2,199. Asegúrate de tener saldo disponible.',
      ctaLabel: 'Ver en Fijos',
      actionType: 'NAVIGATE_RECURRING',
      dismissible: true,
      metadata: { billId: 'bill-1', expectedAmount: 2199 },
    },
  ],
  counts: {
    total: 1,
    imminentBills: 1,
    pacingRisks: 0,
    unclassified: 0,
  },
};

afterEach(() => mock.reset());

describe('proactiveService', () => {
  it('validates and maps the proactive feed contract', async () => {
    mock.onGet('/proactive/feed').reply(200, { success: true, data: sampleFeed });
    const result = await proactiveService.feed('DOP');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('IMMINENT_BILL');
    expect(result.counts.total).toBe(1);
  });

  it('posts dismiss request to the action endpoint', async () => {
    mock.onPost('/proactive/actions/action-123/dismiss').reply(200, {
      success: true,
      data: { dismissed: true, actionId: 'action-123' },
    });
    await expect(proactiveService.dismiss('action-123')).resolves.toBeUndefined();
  });

  it('fetches weekly checkin data', async () => {
    const sampleCheckin = {
      weekKey: '2026-W37',
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      currency: 'DOP',
      totalSpentThisWeek: 4500,
      totalSpentPreviousWeek: 5000,
      changePercent: -10,
      netDifference: -500,
      topCategory: { name: 'Supermercado', amount: 3000, percentage: 67 },
      topMerchant: { name: 'Bravo', amount: 3000 },
      daysToNextPayday: 7,
      estimatedDailyAllowance: 1200,
      status: 'OPEN',
      completedAt: null,
    };
    mock.onGet('/proactive/weekly-checkin').reply(200, { success: true, data: sampleCheckin });
    const result = await proactiveService.weeklyCheckin('DOP');
    expect(result.weekKey).toBe('2026-W37');
    expect(result.totalSpentThisWeek).toBe(4500);
    expect(result.changePercent).toBe(-10);
  });

  it('posts complete weekly checkin request', async () => {
    const completedCheckin = {
      weekKey: '2026-W37',
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      currency: 'DOP',
      totalSpentThisWeek: 4500,
      totalSpentPreviousWeek: 5000,
      changePercent: -10,
      netDifference: -500,
      topCategory: null,
      topMerchant: null,
      daysToNextPayday: 7,
      estimatedDailyAllowance: 1200,
      status: 'COMPLETED',
      completedAt: '2026-09-08T19:00:00.000Z',
    };
    mock.onPost('/proactive/weekly-checkin/2026-W37/complete').reply(200, {
      success: true,
      data: completedCheckin,
    });
    const result = await proactiveService.completeWeeklyCheckin('2026-W37', 'DOP');
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe('2026-09-08T19:00:00.000Z');
  });

  it('calls simulateExpense and returns projection verdict', async () => {
    const sampleResult = {
      currency: 'DOP' as const,
      simulatedAmount: 1500,
      verdict: 'SAFE' as const,
      currentDailyAllowance: 1500,
      projectedDailyAllowance: 1250,
      allowanceDifference: -250,
      daysRemaining: 10,
      adviceTitle: 'Gasto seguro',
      adviceDescription: 'Tu margen diario proyectado se mantendrá saludable.',
      categoryImpact: {
        categoryKey: 'restaurantes',
        categoryLabel: 'Restaurantes',
        currentSpent: 2000,
        projectedSpent: 3500,
        limit: 5000,
        currentPercent: 40,
        projectedPercent: 70,
        status: 'HEALTHY' as const,
      },
    };
    mock.onPost('/proactive/simulate-expense').reply(200, {
      success: true,
      data: sampleResult,
    });
    const result = await proactiveService.simulateExpense({
      amount: 1500,
      currency: 'DOP',
      categoryKey: 'restaurantes',
    });
    expect(result.verdict).toBe('SAFE');
    expect(result.projectedDailyAllowance).toBe(1250);
    expect(result.categoryImpact?.projectedPercent).toBe(70);
  });

  it('fetches weekly digest preview', async () => {
    const samplePreview = {
      subject: 'Resumen Semanal Cuadre · Semana 37',
      recipient: 'adrian@cuadre.local',
      weekKey: '2026-W37',
      html: '<html><body>Preview content</body></html>',
      generatedAt: '2026-09-08T19:00:00.000Z',
    };
    mock.onGet('/proactive/weekly-digest/preview').reply(200, {
      success: true,
      data: samplePreview,
    });
    const result = await proactiveService.weeklyDigestPreview('DOP');
    expect(result.subject).toContain('Resumen Semanal');
    expect(result.weekKey).toBe('2026-W37');
    expect(result.html).toContain('Preview content');
  });

  it('posts sendWeeklyDigestTest and returns dispatch status', async () => {
    mock.onPost('/proactive/weekly-digest/send-test').reply(200, {
      success: true,
      data: {
        delivered: true,
        recipient: 'test@example.com',
        subject: 'Resumen Semanal',
        mode: 'SMTP' as const,
      },
    });
    const result = await proactiveService.sendWeeklyDigestTest({
      currency: 'DOP',
    });
    expect(result.delivered).toBe(true);
    expect(result.mode).toBe('SMTP');
    expect(result.recipient).toBe('test@example.com');
  });

  it('reads and updates proactive email preferences', async () => {
    const preferences = {
      weeklyDigestEnabled: false, criticalAlertsEnabled: true,
      digestSchedule: 'MONDAY_0730' as const, timezone: 'America/Santo_Domingo',
      recipientMasked: 'ad****@example.com',
    };
    mock.onGet('/proactive/email-preferences').reply(200, { success: true, data: preferences });
    mock.onPut('/proactive/email-preferences').reply((request) => [200, {
      success: true, data: { ...preferences, ...JSON.parse(request.data) },
    }]);
    expect(await proactiveService.emailPreferences()).toEqual(preferences);
    const updated = await proactiveService.updateEmailPreferences({
      weeklyDigestEnabled: true, criticalAlertsEnabled: true, digestSchedule: 'SUNDAY_1800',
    });
    expect(updated).toMatchObject({ weeklyDigestEnabled: true, digestSchedule: 'SUNDAY_1800' });
  });
});


