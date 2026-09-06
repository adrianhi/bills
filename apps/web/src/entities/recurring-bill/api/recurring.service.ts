import {
  recurringBillResponseSchema, recurringRadarResponseSchema,
  type RecurringBillDto, type RecurringRadarDto, type UpdateRecurringBillInput,
} from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

export const recurringService = {
  async radar(currency: string, signal?: AbortSignal): Promise<RecurringRadarDto> {
    const response = await httpClient.get('/recurring', { params: { currency, window: 30 }, signal });
    return parseResponse(recurringRadarResponseSchema, response.data).data;
  },
  async update(id: string, input: UpdateRecurringBillInput): Promise<RecurringBillDto> {
    const response = await httpClient.patch(`/recurring/${id}`, input);
    return parseResponse(recurringBillResponseSchema, response.data).data;
  },
  async acknowledgeAlert(id: string) {
    await httpClient.patch(`/recurring/alerts/${id}`, { acknowledged: true });
  },
};
