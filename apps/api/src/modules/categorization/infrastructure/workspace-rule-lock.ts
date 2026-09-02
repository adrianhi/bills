import type { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/app-error';

export async function lockRuleWorkspace(tx: Prisma.TransactionClient, workspaceId: string) {
  await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
}
export async function assertNoActiveApplication(tx: Prisma.TransactionClient, workspaceId: string) {
  if (await tx.ruleApplication.count({ where: { workspaceId, status: { in: ['QUEUED', 'PROCESSING'] } } })) {
    throw new AppError(409, 'RULE_APPLICATION_ACTIVE', 'Espera a que termine la aplicación en curso.');
  }
}
