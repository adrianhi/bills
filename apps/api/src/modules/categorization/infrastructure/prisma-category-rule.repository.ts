import { prisma } from '../../../config/database';
import type { CreateCategoryRuleInput } from '../../../schemas/transaction.schema';

export class PrismaCategoryRuleRepository {
  list(workspaceId: string) { return prisma.categoryRule.findMany({ where: { workspaceId }, orderBy: { priority: 'desc' } }); }
  create(workspaceId: string, input: CreateCategoryRuleInput) { return prisma.categoryRule.create({ data: { ...input, workspaceId } }); }
  remove(workspaceId: string, id: string) { return prisma.categoryRule.deleteMany({ where: { id, workspaceId } }); }
}
