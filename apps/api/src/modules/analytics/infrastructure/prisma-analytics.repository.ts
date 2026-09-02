import { prisma } from '../../../config/database';
import { buildTransactionWhere, visibleTransactionWhere } from '../../transactions';

interface AnalyticsFilters {
  month?: string; startDate?: string; endDate?: string; organization?: string;
  institutionCode?: string; institutionCodes?: string[]; currency?: string;
  category?: string; status?: string; transactionType?: string; search?: string;
}

const selection = {
  amount: true, currency: true, category: true, merchant: true, statusCode: true,
  transactionType: true, source: true, institutionCode: true, transactionDate: true,
} as const;

export class PrismaAnalyticsRepository {
  async findTransactions(workspaceId: string, filters: AnalyticsFilters) {
    const where = buildTransactionWhere(workspaceId, { ...filters, format: 'json' });
    return prisma.transaction.findMany({ where, select: selection, orderBy: { transactionDate: 'asc' } });
  }
  async listCategories(workspaceId: string) {
    return prisma.transaction.groupBy({
      by: ['category'], where: { workspaceId, ...visibleTransactionWhere() }, _count: { _all: true },
    });
  }
}
