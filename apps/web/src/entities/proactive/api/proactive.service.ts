import {
  proactiveFeedResponseSchema,
  sendWeeklyDigestTestResponseSchema,
  simulateExpenseResponseSchema,
  weeklyCheckinResponseSchema,
  weeklyDigestPreviewResponseSchema,
  emailNotificationPreferencesResponseSchema,
  type ProactiveFeedDto,
  type SendWeeklyDigestTestInput,
  type SendWeeklyDigestTestResponse,
  type SimulateExpenseInput,
  type SimulateExpenseResultDto,
  type WeeklyCheckinDto,
  type WeeklyDigestPreviewDto,
  type EmailNotificationPreferencesDto,
  type UpdateEmailNotificationPreferencesInput,
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
  async simulateExpense(input: SimulateExpenseInput, signal?: AbortSignal): Promise<SimulateExpenseResultDto> {
    const response = await httpClient.post('/proactive/simulate-expense', input, { signal });
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
  async emailPreferences(signal?: AbortSignal): Promise<EmailNotificationPreferencesDto> {
    const response = await httpClient.get('/proactive/email-preferences', { signal });
    return parseResponse(emailNotificationPreferencesResponseSchema, response.data).data;
  },
  async updateEmailPreferences(input: UpdateEmailNotificationPreferencesInput): Promise<EmailNotificationPreferencesDto> {
    const response = await httpClient.put('/proactive/email-preferences', input);
    return parseResponse(emailNotificationPreferencesResponseSchema, response.data).data;
  },
};


