import { paydayRitualResponseSchema, type PaydayRitualDto } from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

export const paydayRitualService = {
  async current(currency: string, signal?: AbortSignal): Promise<PaydayRitualDto> {
    const response = await httpClient.get('/payday-ritual/current', { params: { currency }, signal });
    return parseResponse(paydayRitualResponseSchema, response.data).data;
  },
  async complete(cycleKey: string, currency: string): Promise<PaydayRitualDto> {
    const response = await httpClient.post(`/payday-ritual/${cycleKey}/complete`, undefined, { params: { currency } });
    return parseResponse(paydayRitualResponseSchema, response.data).data;
  },
};
