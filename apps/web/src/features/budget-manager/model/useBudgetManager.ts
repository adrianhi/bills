import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BudgetSummaryDto, ReplaceMonthlyBudgetInput } from '@/entities/budget';
import { budgetKeys, budgetService, useBudgetCategories } from '@/entities/budget';

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((item) => item.type === 'year')?.value}-${parts.find((item) => item.type === 'month')?.value}`;
}

export function useBudgetManager(input: {
  open: boolean; month: string; currency: 'DOP' | 'USD'; summary: BudgetSummaryDto | null; onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const categoriesQuery = useBudgetCategories(input.open);
  const [globalLimit, setGlobalLimit] = useState('');
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [propagation, setPropagation] = useState<ReplaceMonthlyBudgetInput['propagation']>('CURRENT_AND_FUTURE');
  const [suggestionNote, setSuggestionNote] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!input.open) return;
    // oxlint-disable-next-line react/set-state-in-effect -- opening hydrates the editor from the resolved monthly snapshot
    setGlobalLimit(input.summary?.global?.limit ? String(input.summary.global.limit) : '');
    setLimits(Object.fromEntries((input.summary?.categories || []).map((item) => [item.categoryKey!, String(item.limit)])));
    setPropagation(input.month < currentMonth() ? 'CURRENT_MONTH' : 'CURRENT_AND_FUTURE');
    setSuggestionNote(''); setValidationError('');
  }, [input.open, input.month, input.summary]);

  const saveMutation = useMutation({
    mutationFn: budgetService.replace,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      input.onSaved();
    },
  });
  const suggestionMutation = useMutation({
    mutationFn: () => budgetService.suggestions(input.month, input.currency),
    onSuccess: (suggestion) => {
      setGlobalLimit(suggestion.globalLimit ? String(suggestion.globalLimit) : '');
      setLimits(Object.fromEntries(suggestion.categories.map((item) => [item.categoryKey, String(item.amount)])));
      setSuggestionNote(suggestion.coverage >= 2
        ? `Sugerencia basada en ${suggestion.coverage} meses completos (${suggestion.monthsUsed.join(', ')}).`
        : 'Todavía no hay dos meses completos para crear una sugerencia.');
    },
  });

  const labels = useMemo(() => new Map((categoriesQuery.data || []).map((item) => [item.key, item.label])), [categoriesQuery.data]);
  const categoryTotal = Object.values(limits).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const globalValue = Number(globalLimit) || 0;

  const save = async () => {
    const categories = Object.entries(limits).filter(([, value]) => value.trim()).map(([categoryKey, amount]) => ({ categoryKey, amount: Number(amount) }));
    if (globalLimit.trim() && (!Number.isFinite(Number(globalLimit)) || Number(globalLimit) <= 0)) {
      setValidationError('El límite global debe ser mayor que cero.'); return;
    }
    if (categories.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      setValidationError('Todos los límites de categoría deben ser mayores que cero.'); return;
    }
    setValidationError('');
    await saveMutation.mutateAsync({
      month: input.month, currency: input.currency, propagation,
      globalLimit: globalLimit.trim() ? Number(globalLimit) : null, categories,
    });
  };

  return {
    categories: categoriesQuery.data || [], labels, globalLimit, setGlobalLimit, limits,
    setLimit: (key: string, value: string) => setLimits((current) => ({ ...current, [key]: value })),
    removeLimit: (key: string) => setLimits((current) => { const next = { ...current }; delete next[key]; return next; }),
    propagation, setPropagation, pastMonth: input.month < currentMonth(), categoryTotal, globalValue,
    suggestionNote, suggest: () => suggestionMutation.mutate(), suggesting: suggestionMutation.isPending,
    save, saving: saveMutation.isPending, error: validationError || saveMutation.error?.message || suggestionMutation.error?.message,
  };
}
