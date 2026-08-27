import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { httpClient } from '@/shared/api';
import { transactionService } from './transaction.service';

const mock = new AxiosMockAdapter(httpClient);
const transaction = {
  id: '1', externalId: 'bank-1', cardLast4: null, cardType: null, rawMerchant: 'BRAVO', merchant: 'Bravo',
  amount: '85.00', currency: 'DOP', status: 'Aprobada', statusCode: 'APPROVED', transactionType: 'Compra',
  category: 'Supermercado', transactionDate: '2026-08-27T12:00:00.000Z', createdAt: '2026-08-27T12:00:00.000Z',
};

afterEach(() => mock.reset());
describe('transactionService', () => {
  it('validates and maps the list contract', async () => {
    mock.onGet('/transactions').reply(200, { success: true, data: [transaction], pagination: { page: 1, limit: 20, total: 1, totalItems: 1, totalPages: 1 } });
    const result = await transactionService.list({ page: 1, limit: 20, currency: 'DOP' });
    expect(result.data[0].amount).toBe(85);
  });
  it('rejects an incompatible response before it reaches a component', async () => {
    mock.onGet('/transactions').reply(200, { success: true, data: [{ id: 1 }] });
    await expect(transactionService.list({ page: 1, limit: 20, currency: 'DOP' })).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' });
  });
});
