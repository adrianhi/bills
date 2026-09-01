import {
  budgetCategoriesResponseSchema, budgetSuggestionResponseSchema, budgetSummaryResponseSchema,
  type BudgetCategoryDto, type BudgetSuggestionDto, type BudgetSummaryDto, type ReplaceMonthlyBudgetInput,
} from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';

export const budgetService = {
  async monthly(month: string, currency: string, signal?: AbortSignal): Promise<BudgetSummaryDto> {
    const response = await httpClient.get('/budgets/monthly', { params: { month, currency }, signal });
    return parseResponse(budgetSummaryResponseSchema, response.data).data;
  },
  async categories(signal?: AbortSignal): Promise<BudgetCategoryDto[]> {
    const response = await httpClient.get('/budgets/categories', { signal });
    return parseResponse(budgetCategoriesResponseSchema, response.data).data;
  },
  async suggestions(month: string, currency: string): Promise<BudgetSuggestionDto> {
    const response = await httpClient.get('/budgets/suggestions', { params: { month, currency } });
    return parseResponse(budgetSuggestionResponseSchema, response.data).data;
  },
  async replace(input: ReplaceMonthlyBudgetInput): Promise<BudgetSummaryDto> {
    const response = await httpClient.put('/budgets/monthly', input);
    return parseResponse(budgetSummaryResponseSchema, response.data).data;
  },
};
