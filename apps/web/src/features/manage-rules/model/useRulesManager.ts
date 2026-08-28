import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryRuleService } from '@/entities/category-rule/api/category-rule.service';
import { COMMON_CATEGORIES } from '@/shared/config/financial-options';

export function useRulesManager(isOpen: boolean, authenticated: boolean) {
  const queryClient = useQueryClient();
  const [pattern, setPattern] = useState('');
  const [normalizedMerchant, setNormalizedMerchant] = useState('');
  const [category, setCategory] = useState<string>(COMMON_CATEGORIES[1]);
  const query = useQuery({
    queryKey: ['category-rules'],
    queryFn: ({ signal }) => categoryRuleService.list(signal),
    enabled: isOpen && authenticated,
  });
  const create = useMutation({
    mutationFn: categoryRuleService.create,
    onSuccess: async () => {
      setPattern('');
      setNormalizedMerchant('');
      await queryClient.invalidateQueries({ queryKey: ['category-rules'] });
    },
  });
  const remove = useMutation({
    mutationFn: categoryRuleService.remove,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['category-rules'] }),
  });

  return {
    rules: query.data ?? [], loading: query.isLoading,
    pattern, setPattern, normalizedMerchant, setNormalizedMerchant, category, setCategory,
    submitting: create.isPending,
    createRule: () => create.mutateAsync({ pattern, normalizedMerchant, category }),
    deleteRule: (id: string) => remove.mutate(id),
    error: query.error || create.error || remove.error,
  };
}
