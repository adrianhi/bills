import { prisma } from '../../../config/database';
import type { PaydayIncomeReader } from '../application/payday-ritual.ports';

export class PrismaPaydayIncomeReader implements PaydayIncomeReader {
  async plannedBiweeklyIncome(workspaceId: string, currency: string) {
    const result = await prisma.incomeStream.aggregate({
      where: { workspaceId, currency, frequency: 'BIWEEKLY_15_30', isActive: true },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }
}
