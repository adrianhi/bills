import { identifyMerchant } from '../domain/merchant-identity';
import { winningRule } from '../domain/rule-matcher';
import type { CategoryRuleRepository } from './rule.ports';

export class CategorizeTransaction {
  constructor(private readonly rules: CategoryRuleRepository) {}
  async categorize(raw: string, merchant: string | null | undefined, category: string | null | undefined, workspaceId: string) {
    const base = identifyMerchant(raw);
    // Repository errors propagate to the ingestion retry mechanism.
    const rule = winningRule(await this.rules.list(workspaceId), raw);
    return {
      merchant: rule?.normalizedMerchant || merchant || base.label,
      category: rule?.category || category || base.category,
      merchantKey: base.key, merchantIdentityLabel: base.identityLabel,
      categoryOrigin: rule ? 'RULE' : 'SYSTEM', merchantOrigin: rule?.normalizedMerchant ? 'RULE' : 'SYSTEM',
      categoryRuleId: rule?.id || null, merchantRuleId: rule?.normalizedMerchant ? rule.id : null,
    };
  }
}
