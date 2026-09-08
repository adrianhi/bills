import {
  proactiveFeedResponseSchema,
  type ProactiveFeedDto,
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
};
