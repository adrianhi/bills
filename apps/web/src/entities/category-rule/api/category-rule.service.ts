import { z } from 'zod';
import { categoryRuleSchema, ruleMerchantSchema, expenseCategorySchema, ruleApplicationSchema,
  type CreateCategoryRuleInput, type UpdateCategoryRuleInput, type PreviewRuleApplicationInput } from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

const listSchema = z.object({ success: z.literal(true), data: z.array(categoryRuleSchema) });

export const categoryRuleService = {
  async list(signal?: AbortSignal) {
    const response = await httpClient.get('/rules', { signal });
    return parseResponse(listSchema, response.data).data;
  },
  async create(input: CreateCategoryRuleInput) {
    const response = await httpClient.post('/rules', input);
    return parseResponse(categoryRuleSchema, response.data?.data);
  },
  async remove(id: string) {
    await httpClient.delete(`/rules/${id}`);
  },
  async update(id: string, input: UpdateCategoryRuleInput) {
    const response = await httpClient.patch(`/rules/${id}`, input);
    return parseResponse(categoryRuleSchema, response.data?.data);
  },
  async categories(signal?: AbortSignal) {
    const response = await httpClient.get('/rules/categories', { signal });
    return parseResponse(z.array(expenseCategorySchema), response.data?.data);
  },
  async merchants(search: string, transactionId?: string, signal?: AbortSignal) {
    const response = await httpClient.get('/rules/merchants', { params: { search, transactionId }, signal });
    return parseResponse(z.array(ruleMerchantSchema), response.data?.data);
  },
  async applications(signal?: AbortSignal) {
    const response = await httpClient.get('/rules/applications', { signal });
    return parseResponse(z.array(ruleApplicationSchema), response.data?.data);
  },
  async preview(id: string, input: PreviewRuleApplicationInput) {
    const response = await httpClient.post(`/rules/${id}/applications/preview`, input);
    return parseResponse(ruleApplicationSchema, response.data?.data);
  },
  async applicationAction(id: string, action: 'confirm' | 'retry') {
    const response = await httpClient.post(`/rules/applications/${id}/${action}`);
    return parseResponse(ruleApplicationSchema, response.data?.data);
  },
};
