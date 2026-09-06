import type { RecordProductViewInput } from '@bills/contracts';
import { httpClient } from '@/shared/api';

export const engagementService = {
  async recordView(input: RecordProductViewInput) {
    await httpClient.post('/engagement/views', input);
  },
};
