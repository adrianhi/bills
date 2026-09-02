import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/shared/api', async (original) => ({ ...await original<typeof import('@/shared/api')>(),
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
import { httpClient } from '@/shared/api';
import { categoryRuleService } from './category-rule.service';

const rule = { id: 'rule', pattern: 'Uber Viajes', matchType: 'MERCHANT', targetKey: 'brand:uber-rides',
  normalizedMerchant: null, category: 'Transporte', priority: 0, isActive: true, version: 2 };
describe('category rule HTTP boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('parses rules and sends exact merchant keys instead of deriving identities', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { data: rule } });
    const input = { pattern: '', matchType: 'MERCHANT' as const, merchantKey: 'brand:uber-rides', category: 'Transporte', priority: 0, isActive: true };
    expect(await categoryRuleService.create(input)).toMatchObject(rule);
    expect(httpClient.post).toHaveBeenCalledWith('/rules', input);
  });
  it('updates with version and handles null aliases', async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({ data: { data: rule } });
    await categoryRuleService.update('rule', { version: 1, normalizedMerchant: null });
    expect(httpClient.patch).toHaveBeenCalledWith('/rules/rule', { version: 1, normalizedMerchant: null });
  });
  it('keeps API errors and malformed responses visible', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: { data: [{ id: 'invalid' }] } });
    await expect(categoryRuleService.list()).rejects.toThrow();
    vi.mocked(httpClient.delete).mockRejectedValue(new Error('locked'));
    await expect(categoryRuleService.remove('rule')).rejects.toThrow('locked');
  });
});
