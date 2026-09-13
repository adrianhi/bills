import { httpClient } from '@/shared/api';
import type { BetaInterestInput, BetaInterestResponse } from '@bills/contracts';

export const betaWaitlistService = {
  async register(input: BetaInterestInput): Promise<BetaInterestResponse> {
    const response = await httpClient.post<BetaInterestResponse>('/beta-interest', input);
    return response.data;
  },
};
