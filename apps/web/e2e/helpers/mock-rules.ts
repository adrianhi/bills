import type { Page } from '@playwright/test';
import { mockAuthenticatedDashboard } from './mock-dashboard';

export async function mockRules(page: Page) {
  await mockAuthenticatedDashboard(page);
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const transaction = { id: 'tx-rule', externalId: 'mail-rule', rawMerchant: 'UBER*RIDES', merchant: 'Uber', category: 'Transporte',
    amount: 299.52, currency: 'DOP', cardLast4: '6234', cardType: 'Débito', status: 'Aprobada', statusCode: 'APPROVED',
    transactionType: 'Compra', source: 'POPULAR_CARD_PURCHASE', institutionCode: 'POPULAR',
    transactionDate: new Date().toISOString(), createdAt: new Date().toISOString(), notes: null };
  let rules: Record<string, unknown>[] = [];
  let jobs: Record<string, unknown>[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const json = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    if (request.method() !== 'GET') calls.push({ path, body: request.postDataJSON() || {} });
    if (path.endsWith('/me/bootstrap')) return json({ onboardingComplete: true, legalAcceptanceRequired: false,
      productGuide: { currentVersion: '2026-09-01.1', versionSeen: '2026-09-01.1', completed: true, completedAt: new Date().toISOString() } });
    if (path.endsWith('/transactions')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      success: true, data: [transaction], pagination: { page: 1, limit: 20, total: 1, totalItems: 1, totalPages: 1 },
    }) });
    if (path.endsWith('/transactions/tx-rule')) { Object.assign(transaction, request.postDataJSON()); return json(transaction); }
    if (path.endsWith('/rules/categories')) return json([{ key: 'transporte', label: 'Transporte' }, { key: 'servicios', label: 'Servicios' }]);
    if (path.endsWith('/rules/merchants')) return json([{ key: 'brand:uber-rides', label: 'Uber Viajes' }, { key: 'brand:uber-eats', label: 'Uber Eats' }]);
    if (path.endsWith('/rules/applications')) return json(jobs);
    if (path.endsWith('/applications/preview')) {
      jobs = [{ id: 'job-1', ruleId: 'rule-1', phase: 'PREVIEW', status: 'READY', includeUnknown: false,
        scanned: 5, matched: 3, changes: 1, categoryChanges: 1, merchantChanges: 0, protectedManual: 1,
        protectedUnknown: 1, otherRule: 0, applied: 0, skipped: 0, errorCode: null, createdAt: new Date().toISOString(),
        sample: [{ transactionId: 'tx-other', merchant: 'Uber', nextMerchant: 'Uber', category: 'Transporte', nextCategory: 'Servicios', reason: 'CHANGE' }] }];
      return json(jobs[0]);
    }
    if (path.endsWith('/confirm')) { jobs[0] = { ...jobs[0], phase: 'APPLY', status: 'PROCESSING' }; return json(jobs[0]); }
    if (path.endsWith('/rules')) {
      if (request.method() === 'POST') {
        rules = [{ ...request.postDataJSON(), id: 'rule-1', pattern: 'Uber Viajes', targetKey: 'brand:uber-rides', normalizedMerchant: null, version: 1 }];
        return json(rules[0]);
      }
      return json(rules);
    }
    return route.fallback();
  });
  return { calls, finish: () => { jobs[0] = { ...jobs[0], phase: 'APPLY', status: 'COMPLETED', applied: 1 }; } };
}
