import { describe, expect, it, vi } from 'vitest';
import { createCategoryRuleInputSchema, previewRuleApplicationSchema } from '@bills/contracts';
import { identifyMerchant } from '../src/modules/categorization/domain/merchant-identity';
import { matchesRule, winningRule, type RuleRecord } from '../src/modules/categorization/domain/rule-matcher';
import { previewDecision } from '../src/modules/categorization/domain/preview-decision';
import { normalizeLabel } from '../src/shared/domain/normalize-label';
import { CategorizeTransaction } from '../src/modules/categorization/application/categorize-transaction';
import { SaveCategoryRule } from '../src/modules/categorization/application/save-category-rule';
import { ProcessRuleApplication } from '../src/modules/categorization/application/process-rule-application';
import type { CategoryRuleRepository } from '../src/modules/categorization/application/rule.ports';
import type { RuleApplications } from '../src/modules/categorization/application/rule-application.port';

const rule = (overrides: Partial<RuleRecord> = {}): RuleRecord => ({
  id: 'rule-a', pattern: 'UBER', matchType: 'CONTAINS', targetKey: 'uber', normalizedMerchant: null,
  category: 'Transporte', priority: 0, version: 1, isActive: true, createdAt: '2026-09-01', ...overrides,
});
const candidate = { id: 'tx', rawMerchant: 'UBER*RIDES', merchant: 'Mi alias', category: 'Otros',
  categoryOrigin: 'SYSTEM', merchantOrigin: 'SYSTEM', classificationVersion: 3 };
const repository = (rules = [rule()]): CategoryRuleRepository => ({
  list: vi.fn().mockResolvedValue(rules), save: vi.fn().mockResolvedValue(rules[0]),
  remove: vi.fn(), exportForWorkspaces: vi.fn(),
});

describe('safe custom categorization', () => {
  it('normalizes decomposed accents, case and collapsed whitespace', () => {
    expect(normalizeLabel('  FÁRMACIA  CÁROL ')).toBe('farmacia carol');
    expect(matchesRule(rule({ pattern: 'FÁRMACIA CÁROL' }), 'farmacia   carol sucursal')).toBe(true);
  });
  it('keeps Uber rides and Uber Eats separate, including compact and POS variants', () => {
    const exact = rule({ matchType: 'MERCHANT', targetKey: 'brand:uber-rides' });
    expect(matchesRule(exact, 'UBER*RIDES')).toBe(true);
    for (const raw of ['UBER EATS', 'UBEREATS', 'UBER*EATS']) {
      expect(matchesRule(exact, raw)).toBe(false);
      expect(identifyMerchant(raw).key).toBe('brand:uber-eats');
      expect(identifyMerchant(raw).category).toBe('Restaurantes & Delivery');
    }
  });
  it('does not merge brands from a grouped system rule', () => {
    expect(identifyMerchant('GITHUB').key).not.toBe(identifyMerchant('MICROSOFT').key);
  });
  it('treats executable-looking patterns and wildcards literally', () => {
    const literal = rule({ pattern: '(a+)+$' });
    expect(matchesRule(literal, 'a'.repeat(10000))).toBe(false);
    expect(matchesRule(literal, 'shop (a+)+$')).toBe(true);
    expect(matchesRule(rule({ pattern: '.*' }), 'UBER')).toBe(false);
  });
  it('resolves exact before contains, then legacy priority, specificity and stable id', () => {
    const broad = rule({ priority: 100 });
    const exact = rule({ id: 'exact', matchType: 'MERCHANT', targetKey: 'brand:uber-eats', priority: 0 });
    expect(winningRule([broad, exact], 'UBER EATS')?.id).toBe('exact');
    const specific = rule({ id: 'specific', pattern: 'UBER EATS' });
    expect(winningRule([rule(), specific], 'UBER EATS')?.id).toBe('specific');
    expect(winningRule([broad, specific], 'UBER EATS')?.id).toBe('rule-a');
    expect(winningRule([rule({ id: 'b' }), rule({ id: 'a' })], 'UBER')?.id).toBe('a');
  });
  it('ignores inactive and income rules', () => {
    expect(winningRule([rule({ isActive: false }), rule({ category: 'Ingresos / Transferencias' })], 'UBER')).toBeUndefined();
  });
  it('prioritizes a custom category over a parser category, without renaming unless asked', async () => {
    const service = new CategorizeTransaction(repository([rule({ category: 'Servicios' })]));
    const result = await service.categorize('UBER*RIDES', 'Uber', 'Transporte', 'workspace');
    expect(result).toMatchObject({ category: 'Servicios', categoryOrigin: 'RULE', merchant: 'Uber', merchantOrigin: 'SYSTEM' });
  });
  it('propagates database failures instead of silently using built-in rules', async () => {
    const repo = repository(); vi.mocked(repo.list).mockRejectedValue(new Error('offline'));
    await expect(new CategorizeTransaction(repo).categorize('UBER', null, null, 'workspace')).rejects.toThrow('offline');
  });
  it('protects each manual field independently', () => {
    const target = rule({ normalizedMerchant: 'Uber personal' });
    const result = previewDecision({ ...candidate, merchantOrigin: 'MANUAL' }, target, [target], false)!;
    expect(result.after).toMatchObject({ category: 'Transporte', merchant: 'Mi alias', changeCategory: true, changeMerchant: false });
    expect(result.protectedManual).toBe(1);
  });
  it('requires opt-in for legacy origins but never overwrites manual origins', () => {
    const row = { ...candidate, categoryOrigin: 'LEGACY_UNKNOWN', merchantOrigin: 'MANUAL' };
    const target = rule({ normalizedMerchant: 'Alias automático' });
    expect(previewDecision(row, target, [target], false)?.after.changeCategory).toBe(false);
    expect(previewDecision(row, target, [target], true)?.after).toMatchObject({ changeCategory: true, changeMerchant: false });
  });
  it('does not chain aliases and reports another winning rule', () => {
    expect(previewDecision({ ...candidate, rawMerchant: 'UNKNOWN', merchant: 'UBER' }, rule(), [rule()], true)).toBeNull();
    const exact = rule({ id: 'exact', matchType: 'MERCHANT', targetKey: 'brand:uber-rides' });
    expect(previewDecision(candidate, rule(), [rule(), exact], true)?.reason).toBe('OTHER_RULE');
  });
  it('validates discriminator, alias length and real dates', () => {
    expect(createCategoryRuleInputSchema.safeParse({ matchType: 'MERCHANT', category: 'Transporte' }).success).toBe(false);
    expect(createCategoryRuleInputSchema.safeParse({ pattern: 'U', category: 'Transporte' }).success).toBe(false);
    expect(createCategoryRuleInputSchema.safeParse({ pattern: 'UBER', category: 'Transporte', normalizedMerchant: 'x'.repeat(61) }).success).toBe(false);
    expect(previewRuleApplicationSchema.safeParse({ startDate: '2026-02-30' }).success).toBe(false);
    expect(previewRuleApplicationSchema.safeParse({ startDate: '2026-09-02', endDate: '2026-09-01' }).success).toBe(false);
  });
  it('validates available categories and identities server-side', async () => {
    const save = new SaveCategoryRule(repository(), { list: async () => [{ key: 'transporte', label: 'Transporte' }] },
      { categoryLabels: async () => [], merchants: async () => [] });
    await expect(save.execute('workspace', createCategoryRuleInputSchema.parse({ pattern: 'UBER', category: 'Ingresos' }))).rejects.toMatchObject({ code: 'INVALID_CATEGORY' });
    await expect(save.execute('workspace', createCategoryRuleInputSchema.parse({ matchType: 'MERCHANT', merchantKey: 'fake', category: 'Transporte' }))).rejects.toMatchObject({ code: 'INVALID_MERCHANT' });
  });
  it('checkpoints bounded previews and routes failures to persisted retry', async () => {
    const job = { id: 'job', phase: 'PREVIEW', ruleId: 'rule-a', rulesSnapshot: [rule()], includeUnknown: false };
    const store = { claim: vi.fn().mockResolvedValue(job), checkpoint: vi.fn(), fail: vi.fn() } as unknown as RuleApplications;
    const candidates = { page: vi.fn().mockResolvedValue([candidate]) };
    const process = new ProcessRuleApplication(store, candidates);
    await process.processNext();
    expect(store.checkpoint).toHaveBeenCalledWith(job, expect.any(Array), 1, 'tx', true);
    candidates.page.mockRejectedValueOnce(new Error('db error'));
    await process.processNext();
    expect(store.fail).toHaveBeenCalledWith(job);
  });
});
