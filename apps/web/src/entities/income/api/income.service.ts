import type {
  CashFlowSummaryDto,
  CreateIncomeStreamInput,
  IncomeStreamDto,
  UpdateIncomeStreamInput,
} from '@bills/contracts';
import { httpClient } from '@/shared/api';

export const incomeKeys = {
  all: ['incomes'] as const,
  streams: () => [...incomeKeys.all, 'streams'] as const,
  cashFlow: (month: string, currency: string) => [...incomeKeys.all, 'cashFlow', month, currency] as const,
};

export const incomeService = {
  async listStreams(signal?: AbortSignal): Promise<IncomeStreamDto[]> {
    const response = await httpClient.get<{ success: boolean; data: IncomeStreamDto[] }>('/incomes/streams', { signal });
    return response.data.data;
  },

  async createStream(input: CreateIncomeStreamInput): Promise<IncomeStreamDto> {
    const response = await httpClient.post<{ success: boolean; data: IncomeStreamDto }>('/incomes/streams', input);
    return response.data.data;
  },

  async updateStream(id: string, input: UpdateIncomeStreamInput): Promise<IncomeStreamDto> {
    const response = await httpClient.patch<{ success: boolean; data: IncomeStreamDto }>(`/incomes/streams/${id}`, input);
    return response.data.data;
  },

  async deleteStream(id: string): Promise<boolean> {
    const response = await httpClient.delete<{ success: boolean }>(`/incomes/streams/${id}`);
    return response.data.success;
  },

  async cashFlowSummary(month: string, currency: string, signal?: AbortSignal): Promise<CashFlowSummaryDto> {
    const response = await httpClient.get<{ success: boolean; data: CashFlowSummaryDto }>('/incomes/cashflow', {
      params: { month, currency },
      signal,
    });
    return response.data.data;
  },
};
