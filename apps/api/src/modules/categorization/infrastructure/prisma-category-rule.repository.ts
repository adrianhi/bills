import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import type { CategoryRuleRepository, RuleWrite } from '../application/rule.ports';
import { lockRuleWorkspace, assertNoActiveApplication } from './workspace-rule-lock';

export class PrismaCategoryRuleRepository implements CategoryRuleRepository {
  list(workspaceId: string) { return prisma.categoryRule.findMany({ where: { workspaceId }, orderBy: { priority: 'desc' } }); }
  async save(workspaceId: string, input: RuleWrite, id?: string, version?: number) {
    return prisma.$transaction(async (tx) => {
      await lockRuleWorkspace(tx, workspaceId);
      await assertNoActiveApplication(tx, workspaceId);
      const duplicate = await tx.categoryRule.findFirst({ where: {
        workspaceId, matchType: input.matchType, targetKey: input.targetKey, ...(id ? { id: { not: id } } : {}),
      } });
      if (duplicate) throw new AppError(409, 'RULE_ALREADY_EXISTS', 'Ya existe una regla para este objetivo. Edítala o actívala.');
      if (!id) return tx.categoryRule.create({ data: { ...input, workspaceId } });
      const result = await tx.categoryRule.updateMany({ where: { id, workspaceId, version }, data: { ...input, version: { increment: 1 } } });
      if (!result.count) throw new AppError(409, 'RULE_VERSION_CONFLICT', 'La regla cambió. Actualiza la lista.');
      return tx.categoryRule.findUniqueOrThrow({ where: { id } });
    });
  }
  async remove(workspaceId: string, id: string) {
    await prisma.$transaction(async (tx) => {
      await lockRuleWorkspace(tx, workspaceId);
      await assertNoActiveApplication(tx, workspaceId);
      const result = await tx.categoryRule.deleteMany({ where: { id, workspaceId } });
      if (!result.count) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Regla no encontrada.');
    });
  }
  exportForWorkspaces(workspaceIds: string[]) {
    return prisma.categoryRule.findMany({ where: { workspaceId: { in: workspaceIds } } });
  }
}
