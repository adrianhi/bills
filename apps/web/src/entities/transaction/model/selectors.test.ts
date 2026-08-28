import { describe, expect, it } from 'vitest';
import type { Transaction } from './types';
import { groupTransactionsByDate, isReceivedTransfer, statusCode } from './selectors';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: '1', externalId: 'external', cardLast4: null, cardType: null, rawMerchant: 'UBER', merchant: 'Uber',
  amount: 100, currency: 'DOP', status: 'Aprobada', statusCode: 'APPROVED', transactionType: 'Compra',
  category: 'Transporte', transactionDate: '2026-08-27T12:00:00.000Z', createdAt: '2026-08-27T12:00:00.000Z',
  ...overrides,
});

describe('transaction selectors', () => {
  it('uses the canonical status and recognizes income', () => {
    expect(statusCode(transaction({ statusCode: 'REVERSED' }))).toBe('REVERSED');
    expect(isReceivedTransfer(transaction({ transactionType: 'Transferencia Recibida' }))).toBe(true);
  });
  it('excludes reversed transactions from daily totals', () => {
    const [group] = groupTransactionsByDate([transaction(), transaction({ id: '2', statusCode: 'REVERSED', amount: 50 })]);
    expect(group.totalExpenseDOP).toBe(100);
    expect(group.transactions).toHaveLength(2);
  });
});
