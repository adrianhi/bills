import { expect, test, type Page } from '@playwright/test';

const GUIDE_VERSION = '2026-09-01.1';

async function mockAuthenticatedDashboard(page: Page) {
  const productGuideUpdates: boolean[] = [];
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-example-auth-token', JSON.stringify({
      access_token: 'e2e-access-token',
      refresh_token: 'e2e-refresh-token',
      expires_in: 31_536_000,
      expires_at: 4_102_444_800,
      token_type: 'bearer',
      user: {
        id: 'e2e-user',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'tour@example.com',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-01-01T00:00:00.000Z',
      },
    }));
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (data: unknown) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(data),
    });

    if (path.endsWith('/me/bootstrap')) {
      return json({
        success: true,
        data: {
          onboardingComplete: true,
          legalAcceptanceRequired: false,
          productGuide: {
            currentVersion: GUIDE_VERSION,
            versionSeen: null,
            completedAt: null,
            completed: false,
          },
        },
      });
    }
    if (path.endsWith('/me/product-guide')) {
      const completed = Boolean(request.postDataJSON()?.completed);
      productGuideUpdates.push(completed);
      return json({
        success: true,
        data: {
          currentVersion: GUIDE_VERSION,
          versionSeen: GUIDE_VERSION,
          completedAt: completed ? '2026-08-31T12:00:00.000Z' : null,
          completed,
        },
      });
    }
    if (path.endsWith('/inbox-connections')) return json({ success: true, data: [] });
    if (path.endsWith('/transactions')) {
      return json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalItems: 0, totalPages: 0 },
      });
    }
    if (path.endsWith('/stats/summary')) {
      return json({
        success: true,
        data: {
          period: '2026-08',
          totalAmount: 0,
          totalIncome: 0,
          totalTransactions: 0,
          approvedCount: 0,
          rejectedCount: 0,
          reversedCount: 0,
          pendingCount: 0,
          currency: 'DOP',
          dailyAverage: 0,
          insights: [],
          byCategory: [],
          byOrganization: [],
          dailyTrend: [],
        },
      });
    }
    if (path.endsWith('/budgets/monthly')) {
      return json({
        success: true,
        data: {
          month: '2026-09', currency: 'DOP', hasBudget: false, totalSpent: 0,
          totalPending: 0, unbudgetedSpent: 0, global: null, categories: [], alerts: [],
        },
      });
    }
    return json({ success: true, data: [] });
  });

  return productGuideUpdates;
}

async function expectSettledStep(page: Page, title: string) {
  await expect(page.locator('[data-product-tour-phase="settled"]')).toBeVisible();
  await expect(page.locator('[data-product-tour-card]')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const primaryAction = title === 'Decide antes de gastar' ? 'Terminar' : 'Siguiente';
  await expect(page.getByRole('button', { name: primaryAction })).toBeFocused();
}

async function moveTour(page: Page, action: 'Atrás' | 'Siguiente', title: string) {
  const transition = page.locator('[data-product-tour-phase]:not([data-product-tour-phase="settled"])');
  await Promise.all([
    transition.waitFor({ state: 'visible' }),
    // Dispatch directly because this test advances faster than the intentional
    // entrance animation; pointer behavior is covered by the Escape/navigation test.
    page.getByRole('button', { name: action }).dispatchEvent('click'),
  ]);
  await expectSettledStep(page, title);
}

test('the tour settles every target before revealing its card', async ({ page }) => {
  test.setTimeout(60_000);
  const productGuideUpdates = await mockAuthenticatedDashboard(page);
  await page.goto('/app/home');
  await page.getByRole('button', { name: 'Ver recorrido' }).click();

  await expectSettledStep(page, 'Tu conexión, siempre clara');
  await moveTour(page, 'Siguiente', 'Mira el período que te importa');
  await moveTour(page, 'Atrás', 'Tu conexión, siempre clara');
  await moveTour(page, 'Siguiente', 'Mira el período que te importa');

  for (const title of [
    'Encuentra cualquier movimiento',
    'Añade lo que falte',
    'Detecta patrones',
    'Decide antes de gastar',
  ]) {
    await moveTour(page, 'Siguiente', title);
  }

  const target = page.locator('[data-product-tour="budget-overview"]');
  const bottomNavigation = page.locator('[data-product-tour-occluder="bottom-navigation"]');
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  if (await bottomNavigation.isVisible()) {
    const navigationBox = await bottomNavigation.boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(targetBox!.y + targetBox!.height).toBeLessThan(navigationBox!.y);
  }

  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.locator('[data-product-tour-phase]')).toHaveCount(0);
  expect(productGuideUpdates).toEqual([false, true]);
});

test('Escape cancels the tour and leaves normal navigation usable', async ({ page }) => {
  const productGuideUpdates = await mockAuthenticatedDashboard(page);
  await page.goto('/app/home');
  await page.getByRole('button', { name: 'Ver recorrido' }).click();
  await expectSettledStep(page, 'Tu conexión, siempre clara');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-product-tour-phase]')).toHaveCount(0);
  expect(productGuideUpdates).toEqual([false, false]);
  await page.getByRole('button', { name: 'Movimientos' }).click();
  await expect(page).toHaveURL(/\/app\/transactions/);
});
