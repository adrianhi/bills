import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryRuleService } from '@/entities/category-rule/api/category-rule.service';
import { COMMON_CATEGORIES } from '@/shared/config/financial-options';

export function useRulesManager(isOpen: boolean, authenticated: boolean) {
  const queryClient = useQueryClient();
  const [pattern, setPattern] = useState('');
  const [normalizedMerchant, setNormalizedMerchant] = useState('');
  const [category, setCategory] = useState<string>(COMMON_CATEGORIES[1]);
  const [validationError, setValidationError] = useState('');

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
      setValidationError('');
      await queryClient.invalidateQueries({ queryKey: ['category-rules'] });
    },
  });

  const remove = useMutation({
    mutationFn: categoryRuleService.remove,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['category-rules'] }),
  });

  const rules = query.data ?? [];

  const createRule = async () => {
    const cleanPattern = pattern.trim().toUpperCase();
    const cleanMerchant = normalizedMerchant.trim();

    if (!cleanPattern || cleanPattern.length < 2) {
      setValidationError('El patrón debe tener al menos 2 caracteres');
      return;
    }
    if (!cleanMerchant) {
      setValidationError('El nombre limpio del comercio es requerido');
      return;
    }
    if (rules.some((r) => r.pattern.toUpperCase() === cleanPattern)) {
      setValidationError(`Ya existe una regla para el patrón "${cleanPattern}"`);
      return;
    }

    setValidationError('');
    await create.mutateAsync({
      pattern: cleanPattern,
      normalizedMerchant: cleanMerchant,
      category,
    });
  };

  return {
    rules,
    loading: query.isLoading,
    pattern,
    setPattern: (val: string) => {
      setPattern(val);
      if (validationError) setValidationError('');
    },
    normalizedMerchant,
    setNormalizedMerchant: (val: string) => {
      setNormalizedMerchant(val);
      if (validationError) setValidationError('');
    },
    category,
    setCategory,
    submitting: create.isPending,
    createRule,
    deleteRule: (id: string) => remove.mutate(id),
    error: validationError || (create.error ? (create.error instanceof Error ? create.error.message : 'Error al crear la regla') : null),
  };
}
