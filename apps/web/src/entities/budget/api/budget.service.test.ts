import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { httpClient } from '@/shared/api';
import { budgetService } from './budget.service';

const mock = new AxiosMockAdapter(httpClient);
const summary = {
  month: '2026-09', currency: 'DOP', hasBudget: true, totalSpent: 100, totalPending: 20,
  unbudgetedSpent: 0, alerts: [], categories: [],
  global: {
    scope: 'GLOBAL', categoryKey: null, categoryLabel: null, limit: 1000, spent: 100,
    pending: 20, remaining: 900, exceededBy: 0, percentUsed: 10, projected: null, status: 'ON_TRACK',
  },
};

afterEach(() => mock.reset());

describe('budgetService', () => {
  it('parses monthly budget responses', async () => {
    mock.onGet('/budgets/monthly').reply(200, { success: true, data: summary });
    await expect(budgetService.monthly('2026-09', 'DOP')).resolves.toMatchObject({ month: '2026-09', totalSpent: 100 });
  });

  it('sends replacement input without building category keys in UI', async () => {
    mock.onPut('/budgets/monthly').reply((request) => [200, { success: true, data: summary, received: request.data }]);
    await budgetService.replace({
      month: '2026-09', currency: 'DOP', propagation: 'CURRENT_AND_FUTURE', globalLimit: 1000,
      categories: [{ categoryKey: 'supermercado', amount: 500 }],
    });
    expect(JSON.parse(mock.history.put[0].data).categories[0].categoryKey).toBe('supermercado');
  });
});
