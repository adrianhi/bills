import { describe, expect, it } from 'vitest';
import {
  isFuzzyTransferMatch,
  mostCompleteMerchant,
} from '../src/modules/transactions/domain/transaction-deduplication';

describe('transaction fuzzy deduplication', () => {
  const existing = {
    cardLast4: '8893',
    transactionType: 'Transferencia Enviada',
    category: 'Transferencias',
    merchant: 'SR ARTURO HERRER',
    rawMerchant: 'SR ARTURO HERRER',
  };

  it('only merges compatible transfer notifications', () => {
    expect(isFuzzyTransferMatch(existing, {
      ...existing,
      merchant: 'SR ARTURO HERRERA',
      rawMerchant: 'SR ARTURO HERRERA',
    })).toBe(true);
    expect(isFuzzyTransferMatch(existing, {
      ...existing,
      cardLast4: '1111',
    })).toBe(false);
    expect(isFuzzyTransferMatch(
      { ...existing, transactionType: 'Compra', category: 'Compras' },
      { ...existing, transactionType: 'Compra', category: 'Compras' }
    )).toBe(false);
  });

  it('keeps the most complete merchant description', () => {
    expect(mostCompleteMerchant(existing, {
      ...existing,
      merchant: 'SR ARTURO HERRERA',
      rawMerchant: 'SR ARTURO HERRERA',
    })).toBe('SR ARTURO HERRERA');
  });
});
