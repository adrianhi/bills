import { z } from 'zod';
import { categoryRuleSchema } from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

const listSchema = z.object({ success: z.literal(true), data: z.array(categoryRuleSchema) });

export const categoryRuleService = {
  async list(signal?: AbortSignal) {
    const response = await httpClient.get('/rules', { signal });
    return parseResponse(listSchema, response.data).data;
  },
  async create(input: { pattern: string; normalizedMerchant: string; category: string }) {
    const response = await httpClient.post('/rules', input);
    return parseResponse(categoryRuleSchema, response.data?.data);
  },
  async remove(id: string) {
    await httpClient.delete(`/rules/${id}`);
  },
};
