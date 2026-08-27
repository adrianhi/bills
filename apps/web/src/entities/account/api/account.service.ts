import { httpClient } from '@/shared/api';

export const accountService = {
  async completeOnboarding() { await httpClient.post('/me/onboarding/complete'); },
  async exportData() {
    const response = await httpClient.post<Blob>('/me/data-export', undefined, { responseType: 'blob' });
    return response.data;
  },
  async deleteAccount() {
    await httpClient.delete('/me', { data: { confirmation: 'DELETE_MY_ACCOUNT' } });
  },
};
