import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from './income-visibility.where';
import type { ClassificationCandidates, ClassificationChange, ClassificationWriter } from '../application/classification.port';
import { writeClassificationPage } from './classification-bulk-write';

export class PrismaClassificationCandidates implements ClassificationCandidates {
  page(input: Parameters<ClassificationCandidates['page']>[0]) {
    return prisma.transaction.findMany({
      where: { workspaceId: input.workspaceId, ...visibleTransactionWhere(), createdAt: { lte: input.cutoff },
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
        transactionDate: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) },
      }, orderBy: { id: 'asc' }, take: 250,
      select: { id: true, rawMerchant: true, merchant: true, category: true, categoryOrigin: true, merchantOrigin: true, classificationVersion: true },
    });
  }
}

export class PrismaClassificationWriter implements ClassificationWriter {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  applyMany(...args: Parameters<NonNullable<ClassificationWriter['applyMany']>>) {
    return writeClassificationPage(this.tx, ...args);
  }
  async apply(workspaceId: string, transactionId: string, version: number, change: ClassificationChange,
    ruleId: string, includeUnknown: boolean) {
    const protectedOrigins = includeUnknown ? ['MANUAL'] : ['MANUAL', 'LEGACY_UNKNOWN'];
    const result = await this.tx.transaction.updateMany({
      where: { workspaceId, id: transactionId, classificationVersion: version, ...visibleTransactionWhere(),
        ...(change.changeCategory ? { categoryOrigin: { notIn: protectedOrigins } } : {}),
        ...(change.changeMerchant ? { merchantOrigin: { notIn: protectedOrigins } } : {}),
      }, data: {
        ...(change.changeCategory ? { category: change.category, categoryOrigin: 'RULE', categoryRuleId: ruleId } : {}),
        ...(change.changeMerchant ? { merchant: change.merchant, merchantOrigin: 'RULE', merchantRuleId: ruleId } : {}),
        merchantKey: change.merchantKey, merchantIdentityLabel: change.merchantIdentityLabel,
        classificationVersion: { increment: 1 },
      },
    });
    return result.count === 1;
  }
}
