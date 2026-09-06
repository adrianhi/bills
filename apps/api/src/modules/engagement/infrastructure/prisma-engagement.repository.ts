import { prisma } from '../../../config/database';
import type { EngagementRepository } from '../application/engagement.ports';

export class PrismaEngagementRepository implements EngagementRepository {
  async record(input: Parameters<EngagementRepository['record']>[0]) {
    await prisma.productEvent.upsert({
      where: { workspaceId_profileId_name_contextKey: {
        workspaceId: input.workspaceId, profileId: input.profileId,
        name: input.name, contextKey: input.contextKey,
      } },
      create: input,
      update: {},
    });
  }

  async removeExpired(before: Date) {
    await prisma.productEvent.deleteMany({ where: { occurredAt: { lt: before } } });
  }
}
