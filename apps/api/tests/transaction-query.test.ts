import { describe, expect, it } from 'vitest';
import { buildTransactionWhere } from '../src/modules/transactions/infrastructure/prisma-transaction.query';

describe('transaction query adapter', () => {
  it('normalizes bank aliases and protects workspace isolation', () => {
    expect(buildTransactionWhere('workspace', {
      page: 1, limit: 20, sortBy: 'transactionDate', sortOrder: 'desc',
      currency: 'dop', organization: 'Banco BHD',
    })).toMatchObject({ workspaceId: 'workspace', currency: 'DOP', institutionCode: 'BHD' });
  });

  it('combines received-transfer and search predicates without overwriting either', () => {
    const where = buildTransactionWhere('workspace', {
      page: 1, limit: 20, sortBy: 'transactionDate', sortOrder: 'desc',
      currency: 'DOP', transactionType: 'recibida', search: 'Ana',
    });
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual([
      { OR: [
        { transactionType: { contains: 'Recibida' } },
        { category: { contains: 'Ingresos' } },
        { source: 'BHD_TRANSFER_INCOME' },
      ] },
      { OR: [
        { merchant: { contains: 'Ana' } },
        { rawMerchant: { contains: 'Ana' } },
        { notes: { contains: 'Ana' } },
      ] },
    ]);
  });
});
