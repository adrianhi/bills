import { prisma } from '../../../config/database';

export class PrismaProfileRepository {
  findSummary(id: string) {
    return prisma.profile.findUnique({ where: { id }, select: { id: true, email: true, displayName: true, timezone: true, defaultCurrency: true, onboardingCompletedAt: true } });
  }
  completeOnboarding(id: string) {
    return prisma.profile.update({ where: { id }, data: { onboardingCompletedAt: new Date() }, select: { onboardingCompletedAt: true } });
  }
}
