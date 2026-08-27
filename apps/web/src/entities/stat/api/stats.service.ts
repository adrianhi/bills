import { statsSummaryResponseSchema, type StatsSummaryDto } from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

export interface StatsFilters {
  currency: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  organization?: string;
}

export const statsService = {
  async summary(filters: StatsFilters, signal?: AbortSignal): Promise<StatsSummaryDto> {
    const response = await httpClient.get('/stats/summary', {
      params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      signal,
    });
    return parseResponse(statsSummaryResponseSchema, response.data).data;
  },
};
