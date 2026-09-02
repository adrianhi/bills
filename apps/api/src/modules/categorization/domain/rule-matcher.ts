import { normalizeLabel, isIncomeCategory } from '../../../shared/domain/normalize-label';
import { identifyMerchant } from './merchant-identity';

export interface RuleRecord {
  id: string; pattern: string; matchType: string; targetKey: string;
  normalizedMerchant: string | null; category: string; priority: number;
  isActive: boolean; version: number; createdAt: Date | string;
}

export function matchesRule(rule: RuleRecord, raw: string): boolean {
  if (!rule.isActive || isIncomeCategory(rule.category)) return false;
  const base = identifyMerchant(raw);
  return rule.matchType === 'MERCHANT' ? rule.targetKey === base.key
    : [raw, base.label].some((text) => normalizeLabel(text).includes(normalizeLabel(rule.pattern)));
}

export function winningRule(rules: RuleRecord[], raw: string): RuleRecord | undefined {
  return rules.filter((rule) => matchesRule(rule, raw)).sort((a, b) =>
    Number(b.matchType === 'MERCHANT') - Number(a.matchType === 'MERCHANT') ||
    b.priority - a.priority || normalizeLabel(b.pattern).length - normalizeLabel(a.pattern).length ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)
  )[0];
}

export type ClassificationOrigin = 'MANUAL' | 'RULE' | 'SYSTEM' | 'LEGACY_UNKNOWN';
export function canReplace(origin: string, includeUnknown: boolean) {
  return origin !== 'MANUAL' && (origin !== 'LEGACY_UNKNOWN' || includeUnknown);
}
