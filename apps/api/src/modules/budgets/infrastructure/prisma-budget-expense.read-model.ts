import { prisma } from '../../../config/database';
import { resolveDateRange, visibleTransactionWhere } from '../../transactions';
import type { BudgetExpenseReadModel } from '../application/budget.ports';
import { normalizeCategoryKey } from '../domain/category-key';
import { santoDomingoMonth } from '../domain/budget-month';

export class PrismaBudgetExpenseReadModel implements BudgetExpenseReadModel {
  async summarizeMonth(workspaceId: string, currency: string, month: string) {
    const rows = await prisma.transaction.groupBy({
      by: ['category', 'statusCode'],
      where: {
        workspaceId, currency, ...visibleTransactionWhere(),
        transactionDate: resolveDateRange(month), statusCode: { in: ['APPROVED', 'PENDING'] },
      },
      _sum: { amount: true }, _count: { _all: true },
    });
    const aggregates = new Map<string, { categoryKey: string; approved: number; pending: number; approvedCount: number }>();
    for (const row of rows) {
      const categoryKey = normalizeCategoryKey(row.category);
      const item = aggregates.get(categoryKey) ?? { categoryKey, approved: 0, pending: 0, approvedCount: 0 };
      const amount = Number(row._sum.amount || 0);
      if (row.statusCode === 'APPROVED') { item.approved += amount; item.approvedCount += row._count._all; }
      else item.pending += amount;
      aggregates.set(categoryKey, item);
    }
    return [...aggregates.values()];
  }

  async history(workspaceId: string, currency: string, months: string[]) {
    return Promise.all(months.map(async (month) => ({
      month,
      expenses: (await this.summarizeMonth(workspaceId, currency, month)).map((item) => ({ ...item, pending: 0 })),
    })));
  }

  async firstExpenseMonth(workspaceId: string, currency: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { workspaceId, currency, statusCode: 'APPROVED', ...visibleTransactionWhere() },
      select: { transactionDate: true }, orderBy: { transactionDate: 'asc' },
    });
    return transaction ? santoDomingoMonth(transaction.transactionDate) : null;
  }

  async listCategoryLabels(workspaceId: string) {
    const transactions = await prisma.transaction.groupBy({
        by: ['category'], where: { workspaceId, ...visibleTransactionWhere() }, _count: { _all: true },
      });
    return transactions.map((item) => item.category);
  }
}
