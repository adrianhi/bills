import { describe, expect, it } from 'vitest';
import { buildTransactionWhere } from '../src/modules/transactions/infrastructure/prisma-transaction.query';

describe('transaction query adapter', () => {
  it('normalizes bank aliases and protects workspace isolation', () => {
    expect(buildTransactionWhere('workspace', {
      page: 1, limit: 20, sortBy: 'transactionDate', sortOrder: 'desc',
      currency: 'dop', organization: 'Banco BHD',
    })).toMatchObject({ workspaceId: 'workspace', currency: 'DOP', institutionCode: 'BHD' });
  });

  it('always excludes hidden income while preserving type and search predicates', () => {
    const where = buildTransactionWhere('workspace', {
      page: 1, limit: 20, sortBy: 'transactionDate', sortOrder: 'desc',
      currency: 'DOP', transactionType: 'servicio', search: 'Claro',
    });
    expect(where.OR).toBeUndefined();
    expect(where.NOT).toEqual({ OR: [
      { transactionType: { contains: 'Recibida', mode: 'insensitive' } },
      { category: { contains: 'Ingresos', mode: 'insensitive' } },
      { source: { contains: 'TRANSFER_INCOME', mode: 'insensitive' } },
    ] });
    expect(where.AND).toEqual([
      { OR: [
        { transactionType: { contains: 'Servicio' } },
        { category: 'Servicios' },
        { source: 'BHD_SERVICE_PAYMENT' },
      ] },
      { OR: [
        { merchant: { contains: 'Claro' } },
        { rawMerchant: { contains: 'Claro' } },
        { notes: { contains: 'Claro' } },
      ] },
    ]);
  });
});
