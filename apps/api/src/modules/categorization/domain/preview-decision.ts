import { canReplace, matchesRule, winningRule, type RuleRecord } from './rule-matcher';
import { identifyMerchant } from './merchant-identity';

interface Candidate {
  id: string; rawMerchant: string; merchant: string; category: string;
  categoryOrigin: string; merchantOrigin: string; classificationVersion: number;
}
export function previewDecision(row: Candidate, rule: RuleRecord, rules: RuleRecord[], includeUnknown: boolean) {
  if (!matchesRule(rule, row.rawMerchant)) return null;
  const winner = winningRule(rules, row.rawMerchant);
  const base = identifyMerchant(row.rawMerchant);
  const own = winner?.id === rule.id;
  const categoryWanted = own && row.category !== rule.category;
  const merchantWanted = own && Boolean(rule.normalizedMerchant) && row.merchant !== rule.normalizedMerchant;
  const changeCategory = categoryWanted && canReplace(row.categoryOrigin, includeUnknown);
  const changeMerchant = merchantWanted && canReplace(row.merchantOrigin, includeUnknown);
  const protectedManual = (categoryWanted && row.categoryOrigin === 'MANUAL') || (merchantWanted && row.merchantOrigin === 'MANUAL');
  const protectedUnknown = !includeUnknown && ((categoryWanted && row.categoryOrigin === 'LEGACY_UNKNOWN') || (merchantWanted && row.merchantOrigin === 'LEGACY_UNKNOWN'));
  return {
    transactionId: row.id, version: row.classificationVersion,
    before: { merchant: row.merchant, category: row.category },
    after: { merchant: changeMerchant ? rule.normalizedMerchant! : row.merchant,
      category: changeCategory ? rule.category : row.category, changeCategory, changeMerchant,
      merchantKey: base.key, merchantIdentityLabel: base.identityLabel },
    reason: !own ? 'OTHER_RULE' : changeCategory || changeMerchant ? 'CHANGE' : protectedManual ? 'MANUAL' : protectedUnknown ? 'UNKNOWN' : 'UNCHANGED',
    protectedManual: Number(protectedManual), protectedUnknown: Number(protectedUnknown),
  };
}
export type PreviewDecision = NonNullable<ReturnType<typeof previewDecision>>;
export function ruleFingerprint(rules: RuleRecord[]) {
  return JSON.stringify(rules.map(({ id, version }) => [id, version]).sort(([a], [b]) => String(a).localeCompare(String(b))));
}
