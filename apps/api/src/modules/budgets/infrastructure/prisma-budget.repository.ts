import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { BudgetRepository } from '../application/budget.ports';

const select = {
  targetKey: true, categoryKey: true, categoryLabel: true, scope: true,
  kind: true, effectiveMonth: true, amount: true, disabled: true,
} as const;

export class PrismaBudgetRepository implements BudgetRepository {
  async listThroughMonth(workspaceId: string, currency: string, month: Date) {
    const rows = await prisma.spendingBudgetLimit.findMany({
      where: { workspaceId, currency, effectiveMonth: { lte: month } }, select,
      orderBy: { effectiveMonth: 'asc' },
    });
    return rows.map((row) => ({ ...row, amount: row.amount === null ? null : Number(row.amount) }));
  }

  async replaceVersion(input: Parameters<BudgetRepository['replaceVersion']>[0]) {
    await prisma.$transaction(async (tx) => {
      if (input.clearMonthOverrides) {
        await tx.spendingBudgetLimit.deleteMany({
          where: { workspaceId: input.workspaceId, currency: input.currency, kind: 'MONTH_OVERRIDE', effectiveMonth: input.month },
        });
      }
      for (const limit of input.limits) {
        const amount = limit.amount === null ? null : new Prisma.Decimal(limit.amount);
        await tx.spendingBudgetLimit.upsert({
          where: { workspaceId_currency_targetKey_kind_effectiveMonth: {
            workspaceId: input.workspaceId, currency: input.currency, targetKey: limit.targetKey,
            kind: input.kind, effectiveMonth: input.month,
          } },
          create: {
            workspaceId: input.workspaceId, currency: input.currency, effectiveMonth: input.month,
            kind: input.kind, ...limit, amount,
          },
          update: {
            scope: limit.scope, categoryKey: limit.categoryKey, categoryLabel: limit.categoryLabel,
            amount, disabled: limit.disabled,
          },
        });
      }
    });
  }

  exportForWorkspaces(workspaceIds: string[]) {
    return prisma.spendingBudgetLimit.findMany({
      where: { workspaceId: { in: workspaceIds } }, orderBy: [{ workspaceId: 'asc' }, { effectiveMonth: 'asc' }],
    });
  }
}
