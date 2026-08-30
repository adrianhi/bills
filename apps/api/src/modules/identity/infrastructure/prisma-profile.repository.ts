import { prisma } from '../../../config/database';

export class PrismaProfileRepository {
  findSummary(id: string) {
    return prisma.profile.findUnique({ where: { id }, select: { id: true, email: true, displayName: true, timezone: true, defaultCurrency: true, onboardingCompletedAt: true, productGuideVersionSeen: true, productGuideCompletedVersion: true, productGuideCompletedAt: true } });
  }
  completeOnboarding(id: string) {
    return prisma.profile.update({ where: { id }, data: { onboardingCompletedAt: new Date() }, select: { onboardingCompletedAt: true } });
  }
  updateProductGuide(id: string, version: string, completed: boolean) {
    return prisma.profile.update({
      where: { id },
      data: {
        productGuideVersionSeen: version,
        ...(completed ? { productGuideCompletedVersion: version, productGuideCompletedAt: new Date() } : {}),
      },
      select: { productGuideVersionSeen: true, productGuideCompletedVersion: true, productGuideCompletedAt: true },
    });
  }
}
