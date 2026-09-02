import type { Prisma } from '@prisma/client';

export function hiddenIncomeWhere(): Prisma.TransactionWhereInput {
  return {
    OR: [
      { transactionType: { contains: 'Recibida', mode: 'insensitive' } },
      { category: { contains: 'Ingresos', mode: 'insensitive' } },
      { source: { contains: 'TRANSFER_INCOME', mode: 'insensitive' } },
    ],
  };
}

export function visibleTransactionWhere(): Prisma.TransactionWhereInput {
  return { NOT: hiddenIncomeWhere() };
}
