import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { resolveDateRange } from '../../transactions';
import type { ApplicationSession, RuleApplicationUnitOfWork } from '../application/rule-application.port';
import { lockRuleWorkspace } from './workspace-rule-lock';

export class PrismaRuleApplicationUnit implements RuleApplicationUnitOfWork {
  run<T>(workspaceId: string, work: (session: ApplicationSession) => Promise<T>) {
    return prisma.$transaction(async (tx) => {
      await lockRuleWorkspace(tx, workspaceId);
      return work({
        rules: () => tx.categoryRule.findMany({ where: { workspaceId } }),
        active: async () => (await tx.ruleApplication.count({ where: { workspaceId, status: { in: ['QUEUED', 'PROCESSING'] } } })) > 0,
        get: (id) => tx.ruleApplication.findFirst({ where: { id, workspaceId } }),
        create: async (ruleId, input, rules, fingerprint) => {
          const range = resolveDateRange(undefined, input.startDate, input.endDate);
          return (await tx.ruleApplication.create({ data: {
            workspaceId, ruleId, includeUnknown: input.includeUnknown, startDate: range.gte, endDate: range.lte,
            rulesSnapshot: JSON.parse(JSON.stringify(rules)) as Prisma.InputJsonValue, fingerprint,
          } })).id;
        },
        queue: async (id, phase) => {
          await tx.ruleApplication.updateMany({ where: { id, workspaceId }, data: {
            phase, status: 'QUEUED', attempts: 0, errorCode: null, nextAttemptAt: new Date(),
          } });
        },
      });
    });
  }
}
