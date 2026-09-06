import { prisma } from '../../../config/database';
import type { PaydayReviewRepository } from '../application/payday-ritual.ports';

export class PrismaPaydayReviewRepository implements PaydayReviewRepository {
  async completedAt(workspaceId: string, profileId: string, cycleKey: string) {
    return (await prisma.paydayRitualReview.findUnique({
      where: { workspaceId_profileId_cycleKey: { workspaceId, profileId, cycleKey } },
      select: { completedAt: true },
    }))?.completedAt || null;
  }

  async complete(workspaceId: string, profileId: string, cycleKey: string) {
    return (await prisma.paydayRitualReview.upsert({
      where: { workspaceId_profileId_cycleKey: { workspaceId, profileId, cycleKey } },
      create: { workspaceId, profileId, cycleKey }, update: {}, select: { completedAt: true },
    })).completedAt;
  }
}
