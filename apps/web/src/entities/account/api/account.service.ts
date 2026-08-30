import { httpClient } from '@/shared/api';
import { productGuideStateSchema } from '@bills/contracts';
import { z } from 'zod';

export const accountService = {
  async completeOnboarding() { await httpClient.post('/me/onboarding/complete'); },
  async updateProductGuide(completed: boolean) {
    const response = await httpClient.patch('/me/product-guide', { completed });
    return z.object({ success: z.literal(true), data: productGuideStateSchema }).parse(response.data).data;
  },
  async exportData() {
    const response = await httpClient.post<Blob>('/me/data-export', undefined, { responseType: 'blob' });
    return response.data;
  },
  async deleteAccount() {
    await httpClient.delete('/me', { data: { confirmation: 'DELETE_MY_ACCOUNT' } });
  },
};
