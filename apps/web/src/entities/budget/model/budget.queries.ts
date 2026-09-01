import { useQuery } from '@tanstack/react-query';
import { budgetService } from '../api/budget.service';

export const budgetKeys = {
  all: ['budgets'] as const,
  monthly: (month: string, currency: string) => ['budgets', 'monthly', month, currency] as const,
  categories: ['budgets', 'categories'] as const,
};

export function useBudgetSummary(month: string, currency: string, enabled = true) {
  return useQuery({
    queryKey: budgetKeys.monthly(month, currency),
    queryFn: ({ signal }) => budgetService.monthly(month, currency, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useBudgetCategories(enabled = true) {
  return useQuery({
    queryKey: budgetKeys.categories,
    queryFn: ({ signal }) => budgetService.categories(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}
