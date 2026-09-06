import type { Page } from '@playwright/test';

const GUIDE_VERSION = '2026-09-01.1';

export async function mockAuthenticatedDashboard(page: Page) {
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
    if (path.endsWith('/budgets/safe-to-spend')) return json({
      success: true, data: {
        date: '2026-09-06', month: '2026-09', currency: 'DOP', status: 'UNSET', reason: 'BUDGET_UNSET',
        globalLimit: null, spentBeforeToday: 0, spentToday: 0, futureConfirmedCommitments: 0,
        daysRemaining: 25, dailyAllowance: 0, todayAvailable: 0, todayOverage: 0, nextDailyAllowance: 0,
      },
    });
    if (path.endsWith('/recurring')) return json({
      success: true, data: {
        currency: 'DOP', generatedAt: '2026-09-06T12:00:00.000Z', analysisStatus: 'READY',
        fixedMonthlyBurden: 0, upcoming: [], upcomingWindows: { in7: 0, in14: 0, in30: 0 },
        suggestions: [], attention: [], paused: [],
      },
    });
    if (path.endsWith('/payday-ritual/current')) return json({
      success: true, data: {
        eligible: false, currency: 'DOP', status: 'UNAVAILABLE', cycleKey: null, cycleStart: null, cycleEnd: null,
        plannedIncome: 0, paidFixed: 0, otherSpent: 0, futureFixed: 0, available: 0, overage: 0,
        dailyAvailable: 0, daysRemaining: 0, completedAt: null,
      },
    });
    if (path.endsWith('/engagement/views')) return json({ success: true, data: { recorded: true } });
    return json({ success: true, data: [] });
  });

  return productGuideUpdates;
}
