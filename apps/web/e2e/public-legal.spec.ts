import { expect, test } from '@playwright/test';

test('public legal route renders through the real router and API contract', async ({ page }) => {
  await page.route('**/api/v1/legal/current', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [{ type: 'TERMS', version: '1.0', title: 'Términos de prueba', slug: 'terms', effectiveAt: '2026-01-01T00:00:00.000Z', content: '# Términos\nContenido verificable.', required: true, accepted: false }] }),
  }));
  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { name: 'Términos de prueba' })).toBeVisible();
  await expect(page.getByText('Contenido verificable.')).toBeVisible();
});

test('an unauthenticated visitor reaches the sign-in experience', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /bills/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
});
