import {
  proactiveFeedResponseSchema,
  sendWeeklyDigestTestResponseSchema,
  simulateExpenseResponseSchema,
  weeklyCheckinResponseSchema,
  weeklyDigestPreviewResponseSchema,
  type ProactiveFeedDto,
  type SendWeeklyDigestTestInput,
  type SendWeeklyDigestTestResponse,
  type SimulateExpenseInput,
  type SimulateExpenseResultDto,
  type WeeklyCheckinDto,
  type WeeklyDigestPreviewDto,
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
  async simulateExpense(input: SimulateExpenseInput): Promise<SimulateExpenseResultDto> {
    const response = await httpClient.post('/proactive/simulate-expense', input);
    return parseResponse(simulateExpenseResponseSchema, response.data).data;
  },
  async weeklyDigestPreview(currency: string, signal?: AbortSignal): Promise<WeeklyDigestPreviewDto> {
    const response = await httpClient.get('/proactive/weekly-digest/preview', { params: { currency }, signal });
    return parseResponse(weeklyDigestPreviewResponseSchema, response.data).data;
  },
  async sendWeeklyDigestTest(input: SendWeeklyDigestTestInput): Promise<SendWeeklyDigestTestResponse['data']> {
    const response = await httpClient.post('/proactive/weekly-digest/send-test', input);
    return parseResponse(sendWeeklyDigestTestResponseSchema, response.data).data;
  },
};


