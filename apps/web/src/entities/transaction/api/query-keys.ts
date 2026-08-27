import type { TransactionFilters } from '@bills/contracts';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.all, 'list', filters] as const,
};
