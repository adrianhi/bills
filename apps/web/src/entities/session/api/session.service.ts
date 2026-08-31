import { z } from 'zod';
import { httpClient } from '@/shared/api';

const pinVerificationResponseSchema = z.object({
  success: z.literal(true),
  token: z.string(),
});

export const sessionService = {
  async verifyPin(pin: string): Promise<string> {
    const response = await httpClient.post('/auth/verify-pin', { pin });
    return pinVerificationResponseSchema.parse(response.data).token;
  },
};
