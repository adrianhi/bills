import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from '../../transactions';
import type { PaydayExpenseReader } from '../application/payday-ritual.ports';

const startBoundary = (date: string) => new Date(`${date}T00:00:00.000-04:00`);
const endBoundary = (date: string) => new Date(`${date}T23:59:59.999-04:00`);

export class PrismaPaydayExpenseReader implements PaydayExpenseReader {
  async summarizeCycle(workspaceId: string, currency: string, start: string, through: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId, currency, statusCode: 'APPROVED', ...visibleTransactionWhere(),
        transactionDate: { gte: startBoundary(start), lte: endBoundary(through) },
      },
      select: {
        amount: true,
        recurringOccurrence: { select: { recurringBill: { select: { status: true } } } },
      },
    });
    return transactions.reduce((summary, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.recurringOccurrence?.recurringBill.status === 'CONFIRMED') summary.paidFixed += amount;
      else summary.otherSpent += amount;
      return summary;
    }, { paidFixed: 0, otherSpent: 0 });
  }
}
