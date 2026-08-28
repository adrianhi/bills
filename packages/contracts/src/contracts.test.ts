import { describe, expect, it } from 'vitest';
import {
  createTransactionInputSchema,
  updateTransactionInputSchema,
  createCategoryRuleInputSchema,
} from './index';

describe('createTransactionInputSchema', () => {
  it('validates a correct manual transaction payload', () => {
    const parsed = createTransactionInputSchema.safeParse({
      externalId: 'man_12345',
      rawMerchant: 'Supermercados Nacional',
      merchant: 'Nacional',
      amount: '1250.75',
      currency: 'dop',
      transactionDate: '2026-08-25T12:00:00Z',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(1250.75);
      expect(parsed.data.currency).toBe('DOP');
      expect(parsed.data.rawMerchant).toBe('Supermercados Nacional');
    }
  });

  it('rejects non-positive and zero amounts', () => {
    const zeroResult = createTransactionInputSchema.safeParse({
      externalId: 'man_123',
      rawMerchant: 'Bravo',
      amount: 0,
      transactionDate: '2026-08-25',
    });
    expect(zeroResult.success).toBe(false);

    const negResult = createTransactionInputSchema.safeParse({
      externalId: 'man_123',
      rawMerchant: 'Bravo',
      amount: -50,
      transactionDate: '2026-08-25',
    });
    expect(negResult.success).toBe(false);
  });

  it('rejects empty merchant', () => {
    const result = createTransactionInputSchema.safeParse({
      externalId: 'man_123',
      rawMerchant: '   ',
      amount: 100,
      transactionDate: '2026-08-25',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTransactionInputSchema', () => {
  it('validates partial update fields', () => {
    const parsed = updateTransactionInputSchema.safeParse({
      merchant: 'Uber Eats',
      category: 'Restaurantes',
      notes: 'Almuerzo equipo',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty merchant or category', () => {
    const parsed = updateTransactionInputSchema.safeParse({
      merchant: '  ',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('createCategoryRuleInputSchema', () => {
  it('normalizes pattern to uppercase and trims', () => {
    const parsed = createCategoryRuleInputSchema.safeParse({
      pattern: '  pedidosya  ',
      normalizedMerchant: 'PedidosYa',
      category: 'Delivery',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pattern).toBe('PEDIDOSYA');
      expect(parsed.data.normalizedMerchant).toBe('PedidosYa');
      expect(parsed.data.category).toBe('Delivery');
    }
  });

  it('rejects short patterns (< 2 characters)', () => {
    const parsed = createCategoryRuleInputSchema.safeParse({
      pattern: 'P',
      normalizedMerchant: 'PedidosYa',
      category: 'Delivery',
    });
    expect(parsed.success).toBe(false);
  });
});
