import {
  transactionListResponseSchema,
  transactionSchema,
  type TransactionFilters,
} from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

function compactParams(filters: Partial<TransactionFilters>) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
}

export const transactionService = {
  async list(filters: TransactionFilters, signal?: AbortSignal) {
    const response = await httpClient.get('/transactions', { params: compactParams(filters), signal });
    return parseResponse(transactionListResponseSchema, response.data);
  },
  async update(input: { id: string; merchant: string; category: string; notes: string }) {
    const response = await httpClient.patch(`/transactions/${input.id}`, input);
    return parseResponse(transactionSchema, response.data?.data);
  },
  async create(input: Record<string, unknown>) {
    const response = await httpClient.post('/transactions', input);
    return parseResponse(transactionSchema, response.data?.data);
  },
  async exportCsv(filters: Partial<TransactionFilters>) {
    const response = await httpClient.get<Blob>('/transactions/export', {
      params: { ...compactParams(filters), format: 'csv' },
      responseType: 'blob',
    });
    return response.data;
  },
};
