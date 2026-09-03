import { expect, test, type Page } from '@playwright/test';
import { mockAuthenticatedDashboard } from './helpers/mock-dashboard';

async function setupReports(page: Page) {
  await mockAuthenticatedDashboard(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await page.route('**/api/v1/financial-institutions', (route) => route.fulfill({
    json: { success: true, data: [{ code: 'BHD', displayName: 'Banco BHD', status: 'ACTIVE', selectable: true }] },
  }));
  const requests: URLSearchParams[] = [];
  await page.route('**/api/v1/reports/financial-export?*', async (route) => {
    requests.push(new URL(route.request().url()).searchParams);
    await route.fulfill({
      contentType: 'text/csv; charset=utf-8',
      headers: { 'Content-Disposition': 'attachment; filename="bills-test.csv"' },
      body: '\uFEFFFecha,Comercio,Monto,Moneda\n02/09/2026,Bravo,100,DOP',
    });
  });
  await page.goto('/app/home');
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  return requests;
}

async function openReport(page: Page) {
  await page.getByRole('button', { name: 'Abrir conexiones y privacidad' }).click();
  await page.getByRole('button', { name: /Exportar datos/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Centro de exportación' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('exports the dashboard all-time selection without introducing a month', async ({ page }) => {
  const requests = await setupReports(page);
  await page.locator('[data-product-tour="period"] button').click();
  await page.getByRole('button', { name: 'Todo', exact: true }).click();
  const dialog = await openReport(page);
  await expect(dialog.getByRole('button', { name: 'Todo el histórico', exact: true })).toHaveCount(2);
  await dialog.getByRole('button', { name: /CSV \(.csv\)/ }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('bills-test.csv');
  expect(requests).toHaveLength(1);
  expect(requests[0].get('month')).toBeNull();
  expect(requests[0].get('startDate')).toBeNull();
  expect(requests[0].get('endDate')).toBeNull();
  expect(requests[0].get('currency')).toBe('DOP');
});

test('recovers from an incompatible budget without clearing the bank filter', async ({ page }, testInfo) => {
  const requests = await setupReports(page);
  const dialog = await openReport(page);
  const budget = dialog.getByRole('checkbox', { name: 'Presupuesto', exact: true });
  await budget.check();
  await dialog.getByRole('checkbox', { name: 'Banco BHD', exact: true }).check();
  await expect(budget).toBeChecked();
  await expect(budget).toBeEnabled();
  await expect(dialog.getByRole('alert')).toContainText('Desmarca Presupuesto');
  await expect(dialog.getByRole('button', { name: 'Descargar XLSX', exact: true })).toBeDisabled();
  await budget.uncheck();
  await expect(dialog.getByRole('button', { name: 'Descargar XLSX', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('checkbox', { name: 'Banco BHD', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: /CSV \(.csv\)/ }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar CSV', exact: true }).click();
  await download;
  expect(requests).toHaveLength(1);
  expect(requests[0].get('institutionCodes')).toBe('BHD');
  expect(requests[0].get('month')).toMatch(/^\d{4}-\d{2}$/);
  await page.screenshot({ path: testInfo.outputPath('report-export.png') });
  expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth + 2)).toBe(false);
});
