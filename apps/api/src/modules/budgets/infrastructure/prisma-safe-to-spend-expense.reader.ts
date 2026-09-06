import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from '../../transactions';
import type { SafeToSpendExpenseReader } from '../application/safe-to-spend.ports';

function boundary(date: string) {
  return new Date(`${date}T00:00:00-04:00`);
}

export class PrismaSafeToSpendExpenseReader implements SafeToSpendExpenseReader {
  async summarize(workspaceId: string, currency: string, today: string) {
    const todayStart = boundary(today);
    const tomorrow = new Date(todayStart.getTime() + 86_400_000);
    const monthStart = boundary(`${today.slice(0, 7)}-01`);
    const where = { workspaceId, currency, statusCode: 'APPROVED' as const, ...visibleTransactionWhere() };
    const [before, current] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, transactionDate: { gte: monthStart, lt: todayStart } }, _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, transactionDate: { gte: todayStart, lt: tomorrow } }, _sum: { amount: true },
      }),
    ]);
    return {
      spentBeforeToday: Number(before._sum.amount || 0),
      spentToday: Number(current._sum.amount || 0),
    };
  }
}
