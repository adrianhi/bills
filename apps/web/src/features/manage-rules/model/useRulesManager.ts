import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategoryRuleInputSchema } from '@bills/contracts';
import { categoryRuleService, categoryRuleKeys, useCategoryRules, useRuleCategories, useRuleMerchants,
  type CategoryRuleDto, type CreateCategoryRuleInput } from '@/entities/category-rule';
import { emptyRule, editRule, type RuleSuggestion } from './rule-editor';

export function useRulesManager(isOpen: boolean, authenticated: boolean, suggestion?: RuleSuggestion) {
  const client = useQueryClient();
  const query = useCategoryRules(isOpen && authenticated);
  const categories = useRuleCategories(isOpen && authenticated);
  const [search, setSearch] = useState('');
  const merchants = useRuleMerchants(isOpen && authenticated, search);
  const suggestedMerchant = useRuleMerchants(isOpen && authenticated && Boolean(suggestion), '', suggestion?.transactionId);
  const [draftState, setDraft] = useState<CreateCategoryRuleInput>(() => emptyRule(suggestion?.category));
  const draft = { ...draftState, category: draftState.category || categories.data?.[0]?.label || '',
    merchantKey: draftState.merchantKey ?? suggestedMerchant.data?.[0]?.key };
  const [editing, setEditing] = useState<CategoryRuleDto | null>(null);
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: async (action: { kind: 'save' } | { kind: 'delete' | 'toggle'; rule: CategoryRuleDto }) => {
      if (action.kind === 'delete') return categoryRuleService.remove(action.rule.id);
      if (action.kind === 'toggle') return categoryRuleService.update(action.rule.id, { version: action.rule.version, isActive: !action.rule.isActive });
      const input = createCategoryRuleInputSchema.parse(draft);
      return editing ? categoryRuleService.update(editing.id, { ...input, version: editing.version }) : categoryRuleService.create(input);
    },
    onSuccess: async () => {
      setError('');
      await client.invalidateQueries({ queryKey: categoryRuleKeys.all });
      await client.invalidateQueries({ queryKey: ['budgets', 'categories'] });
    },
  });
  async function save() {
    try {
      const rule = await mutation.mutateAsync({ kind: 'save' });
      if (rule) setEditing(rule);
      return rule;
    } catch (cause) {
      const parsed = createCategoryRuleInputSchema.safeParse(draft);
      setError(!parsed.success ? parsed.error.issues[0].message : cause instanceof Error ? cause.message : 'No se pudo guardar la regla.');
    }
  }
  const act = (kind: 'delete' | 'toggle', rule: CategoryRuleDto) => {
    mutation.mutate({ kind, rule }, { onError: (cause) => setError(cause.message),
      onSuccess: () => { if (kind === 'delete' && editing?.id === rule.id) { setEditing(null); setDraft(emptyRule()); } } });
  };
  const choices = [...(suggestedMerchant.data || []), ...(merchants.data || [])]
    .filter((item, index, rows) => rows.findIndex((other) => other.key === item.key) === index);
  if (editing?.matchType === 'MERCHANT' && !choices.some((item) => item.key === editing.targetKey)) choices.unshift({ key: editing.targetKey, label: editing.pattern });
  return {
    rules: query.data || [], categories: categories.data || [], merchants: choices,
    loading: query.isLoading || categories.isLoading, search, setSearch, draft, setDraft, editing,
    error: error || query.error?.message || categories.error?.message || merchants.error?.message || suggestedMerchant.error?.message,
    pending: mutation.isPending, save, act,
    edit: (rule: CategoryRuleDto) => { setEditing(rule); setDraft(editRule(rule)); setError(''); },
    reset: () => { setEditing(null); setDraft(emptyRule(categories.data?.[0]?.label)); setError(''); },
  };
}
