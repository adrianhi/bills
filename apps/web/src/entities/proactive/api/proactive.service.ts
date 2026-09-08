import {
  proactiveFeedResponseSchema,
  weeklyCheckinResponseSchema,
  type ProactiveFeedDto,
  type WeeklyCheckinDto,
} from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

export const proactiveService = {
  async feed(currency: string, signal?: AbortSignal): Promise<ProactiveFeedDto> {
    const response = await httpClient.get('/proactive/feed', { params: { currency }, signal });
    return parseResponse(proactiveFeedResponseSchema, response.data).data;
  },
  async dismiss(actionId: string): Promise<void> {
    await httpClient.post(`/proactive/actions/${encodeURIComponent(actionId)}/dismiss`);
  },
  async weeklyCheckin(currency: string, signal?: AbortSignal): Promise<WeeklyCheckinDto> {
    const response = await httpClient.get('/proactive/weekly-checkin', { params: { currency }, signal });
    return parseResponse(weeklyCheckinResponseSchema, response.data).data;
  },
  async completeWeeklyCheckin(weekKey: string, currency: string): Promise<WeeklyCheckinDto> {
    const response = await httpClient.post(
      `/proactive/weekly-checkin/${encodeURIComponent(weekKey)}/complete`,
      {},
      { params: { currency } }
    );
    return parseResponse(weeklyCheckinResponseSchema, response.data).data;
  },
};

