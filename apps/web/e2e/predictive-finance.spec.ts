import { expect, test } from '@playwright/test';
import { mockAuthenticatedDashboard } from './helpers/mock-dashboard';

test('shows and completes the predictive finance workflow', async ({ page }) => {
  await mockAuthenticatedDashboard(page);
  let confirmed = false;
  await page.route('**/api/v1/budgets/safe-to-spend?*', (route) => route.fulfill({ json: {
    success: true, data: {
      date: '2026-09-15', month: '2026-09', currency: 'DOP', status: 'SURPLUS', reason: 'UPCOMING_COMMITMENTS',
      globalLimit: 30000, spentBeforeToday: 10000, spentToday: 500, futureConfirmedCommitments: 3200,
      daysRemaining: 16, dailyAllowance: 1050, todayAvailable: 550, todayOverage: 0, nextDailyAllowance: 1086.67,
    },
  } }));
  await page.route('**/api/v1/recurring?*', (route) => route.fulfill({ json: {
    success: true, data: {
      currency: 'DOP', generatedAt: '2026-09-15T12:00:00.000Z', analysisStatus: 'READY',
      fixedMonthlyBurden: confirmed ? 1200 : 0, upcomingWindows: { in7: confirmed ? 1 : 0, in14: confirmed ? 1 : 0, in30: confirmed ? 1 : 0 },
      upcoming: confirmed ? [bill('CONFIRMED')] : [], suggestions: confirmed ? [] : [bill('SUGGESTED')],
      attention: [], paused: [],
    },
  } }));
  await page.route('**/api/v1/recurring/recurring-1', (route) => {
    confirmed = true;
    return route.fulfill({ json: { success: true, data: bill('CONFIRMED') } });
  });
  await page.route('**/api/v1/payday-ritual/current?*', (route) => route.fulfill({ json: {
    success: true, data: ritual('OPEN'),
  } }));
  await page.route('**/api/v1/payday-ritual/2026-09-15/complete?*', (route) => route.fulfill({ json: {
    success: true, data: ritual('COMPLETED'),
  } }));

  await page.goto('/app/home');
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByText('Dinero libre hoy')).toBeVisible();
  await expect(page.getByText('RD$ 550.00')).toBeVisible();
  await expect(page.getByText('Netflix')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect.poll(() => confirmed).toBe(true);
  await expect(page.getByText('Tu quincena está lista')).toBeVisible();
  await page.getByRole('button', { name: 'Marcar quincena revisada' }).click();
  await expect(page.getByText('Tu quincena está lista')).toBeHidden();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 2)).toBe(true);
});

function bill(status: 'SUGGESTED' | 'CONFIRMED') {
  return {
    id: 'recurring-1', displayName: 'Netflix', currency: 'DOP', cadence: 'MONTHLY', expectedAmount: 1200,
    nextExpectedDate: '2026-09-18', lastSeenAt: '2026-08-18T12:00:00.000Z', occurrenceCount: 3,
    confidence: 0.8, status, userEdited: false, daysRemaining: 3, alerts: [],
  };
}

function ritual(status: 'OPEN' | 'COMPLETED') {
  return {
    eligible: true, currency: 'DOP', status, cycleKey: '2026-09-15', cycleStart: '2026-09-15', cycleEnd: '2026-09-29',
    plannedIncome: 25000, paidFixed: 0, otherSpent: 1000, futureFixed: 3200, available: 20800,
    overage: 0, dailyAvailable: 1386.67, daysRemaining: 15,
    completedAt: status === 'COMPLETED' ? '2026-09-15T12:00:00.000Z' : null,
  };
}
