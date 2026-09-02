import { useQuery } from '@tanstack/react-query';
import { categoryRuleService } from '../api/category-rule.service';

export const categoryRuleKeys = { all: ['category-rules'] as const };
export function useCategoryRules(enabled: boolean) {
  return useQuery({ queryKey: [...categoryRuleKeys.all, 'list'], enabled,
    queryFn: ({ signal }) => categoryRuleService.list(signal) });
}
export function useRuleCategories(enabled: boolean) {
  return useQuery({ queryKey: [...categoryRuleKeys.all, 'categories'], enabled,
    queryFn: ({ signal }) => categoryRuleService.categories(signal) });
}
export function useRuleMerchants(enabled: boolean, search = '', transactionId?: string) {
  return useQuery({ queryKey: [...categoryRuleKeys.all, 'merchants', search, transactionId], enabled,
    queryFn: ({ signal }) => categoryRuleService.merchants(search, transactionId, signal) });
}
export function useRuleApplications(enabled: boolean) {
  return useQuery({ queryKey: [...categoryRuleKeys.all, 'applications'], enabled,
    queryFn: ({ signal }) => categoryRuleService.applications(signal),
    refetchInterval: (query) => query.state.data?.some((job) => ['QUEUED', 'PROCESSING'].includes(job.status)) ? 1500 : false,
  });
}
