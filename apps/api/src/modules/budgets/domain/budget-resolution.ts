export type BudgetLimitKindName = 'RECURRING' | 'MONTH_OVERRIDE';
export type BudgetScopeName = 'GLOBAL' | 'CATEGORY';

export interface BudgetLimitRecord {
  targetKey: string;
  categoryKey: string | null;
  categoryLabel: string | null;
  scope: BudgetScopeName;
  kind: BudgetLimitKindName;
  effectiveMonth: Date;
  amount: number | null;
  disabled: boolean;
}

export type ResolvedBudgetLimit = Omit<BudgetLimitRecord, 'kind' | 'effectiveMonth' | 'disabled'> & { amount: number };

export function resolveBudgetLimits(records: BudgetLimitRecord[], month: Date): ResolvedBudgetLimit[] {
  const requested = month.getTime();
  const recurring = new Map<string, BudgetLimitRecord>();
  const overrides = new Map<string, BudgetLimitRecord>();
  for (const record of records) {
    const effective = record.effectiveMonth.getTime();
    if (record.kind === 'RECURRING' && effective <= requested) {
      const existing = recurring.get(record.targetKey);
      if (!existing || existing.effectiveMonth < record.effectiveMonth) recurring.set(record.targetKey, record);
    }
    if (record.kind === 'MONTH_OVERRIDE' && effective === requested) overrides.set(record.targetKey, record);
  }
  const keys = new Set([...recurring.keys(), ...overrides.keys()]);
  return [...keys].flatMap((key) => {
    const record = overrides.get(key) ?? recurring.get(key);
    if (!record || record.disabled || record.amount === null) return [];
    const { kind: _kind, effectiveMonth: _month, disabled: _disabled, ...resolved } = record;
    return [{ ...resolved, amount: record.amount }];
  }).sort((a, b) => a.scope === b.scope ? (a.categoryLabel || '').localeCompare(b.categoryLabel || '', 'es') : a.scope === 'GLOBAL' ? -1 : 1);
}
