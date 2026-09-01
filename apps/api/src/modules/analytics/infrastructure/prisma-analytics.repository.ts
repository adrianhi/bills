import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { visibleTransactionWhere, type DateRange } from '../../transactions';

const selection = {
  amount: true, currency: true, category: true, merchant: true, statusCode: true,
  transactionType: true, source: true, institutionCode: true, transactionDate: true,
} as const;

export class PrismaAnalyticsRepository {
  async findTransactions(workspaceId: string, range: DateRange, institutionCode?: string) {
    const where: Prisma.TransactionWhereInput = {
      workspaceId,
      ...(range.gte || range.lte ? { transactionDate: range } : {}),
      ...(institutionCode ? { institutionCode } : {}),
      ...visibleTransactionWhere(),
    };
    return prisma.transaction.findMany({ where, select: selection, orderBy: { transactionDate: 'asc' } });
  }
  async listCategories(workspaceId: string) {
    return prisma.transaction.groupBy({
      by: ['category'], where: { workspaceId, ...visibleTransactionWhere() }, _count: { _all: true },
    });
  }
}
