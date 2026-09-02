import { expect, test } from '@playwright/test';
import { mockRules } from './helpers/mock-rules';

test('editing suggests an exact rule, previews protected records and recovers background progress', async ({ page }, testInfo) => {
  const mock = await mockRules(page);
  await page.goto('/app/movimientos');
  await page.locator('button[title="Editar clasificación"]:visible').or(page.getByRole('button', { name: /Uber.*Transporte/ })).first().click();
  const edit = page.getByRole('dialog');
  await edit.locator('select').selectOption('Servicios');
  await edit.getByRole('checkbox').check();
  await edit.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(page.getByRole('heading', { name: 'Reglas de categorización' })).toBeVisible();
  await expect(page.getByLabel('Coincidencia', { exact: true })).toHaveValue('MERCHANT');
  await expect(page.getByLabel('Comercio exacto')).toHaveValue('brand:uber-rides');
  await expect(page.getByLabel('Categoría de la regla')).toHaveValue('Servicios');
  await page.getByRole('button', { name: 'Guardar regla', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preparar vista previa' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Incluir registros anteriores sin origen conocido' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Generar vista previa' }).click();
  await expect(page.getByText(/Manuales protegidos: 1/)).toBeVisible();
  await page.getByText('Ver muestra del antes y después').click();
  await page.screenshot({ path: testInfo.outputPath('rule-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Confirmar 1 cambio', exact: true }).click();
  await expect(page.getByText(/El proceso continuará en segundo plano/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
  mock.finish();
  await page.getByRole('button', { name: 'Abrir conexiones y privacidad' }).click();
  await page.getByRole('button', { name: /Reglas de categorías/ }).click();
  await expect(page.getByText('Aplicación · Completado')).toBeVisible();
  expect(mock.calls.find((call) => call.path.endsWith('/rules'))?.body).toMatchObject({ matchType: 'MERCHANT', merchantKey: 'brand:uber-rides', category: 'Servicios' });
  expect(mock.calls.find((call) => call.path.endsWith('/preview'))?.body).toMatchObject({ includeUnknown: false });
  const overflow = await page.getByRole('dialog').evaluate((element) => element.scrollWidth > element.clientWidth + 2);
  expect(overflow).toBe(false);
});

test('contains mode warns about broad matches and validates without creating a rule', async ({ page }) => {
  const mock = await mockRules(page);
  await page.goto('/app');
  await page.getByRole('button', { name: 'Abrir conexiones y privacidad' }).click();
  await page.getByRole('button', { name: /Reglas de categorías/ }).click();
  await page.getByLabel('Coincidencia', { exact: true }).selectOption('CONTAINS');
  await expect(page.getByText(/“UBER” también coincide con Uber Eats/)).toBeVisible();
  await page.getByLabel('Texto del patrón').fill('U');
  await page.getByRole('button', { name: 'Guardar regla', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('entre 2 y 60');
  expect(mock.calls.some((call) => call.path.endsWith('/rules'))).toBe(false);
});
