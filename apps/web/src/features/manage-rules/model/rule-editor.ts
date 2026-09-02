import type { CategoryRuleDto, CreateCategoryRuleInput } from '@/entities/category-rule';

export interface RuleSuggestion { transactionId: string; category: string; }
export const emptyRule = (category = ''): CreateCategoryRuleInput => ({
  matchType: 'MERCHANT', pattern: '', merchantKey: undefined, normalizedMerchant: '', category, priority: 0, isActive: true,
});
export const editRule = (rule: CategoryRuleDto): CreateCategoryRuleInput => ({
  matchType: rule.matchType, pattern: rule.pattern, merchantKey: rule.matchType === 'MERCHANT' ? rule.targetKey : undefined,
  normalizedMerchant: rule.normalizedMerchant || '', category: rule.category, priority: rule.priority, isActive: rule.isActive,
});
