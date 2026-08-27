import type { AuthenticatedUser } from '../../../types/auth';
import { LegalService } from '../../../services/legal.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { PrismaProfileRepository } from '../infrastructure/prisma-profile.repository';

export class IdentityApplicationService {
  constructor(private readonly profiles: PrismaProfileRepository) {}
  async bootstrap(user: AuthenticatedUser) {
    const [workspace, legalAcceptanceRequired, profile] = await Promise.all([
      WorkspaceService.bootstrap(user), LegalService.hasCurrentRequired(user.id).then((accepted) => !accepted), this.profiles.findSummary(user.id),
    ]);
    return { ...workspace, legalAcceptanceRequired, onboardingComplete: Boolean(profile?.onboardingCompletedAt) };
  }
  async me(user: AuthenticatedUser, workspaceId: string, role?: string) {
    const [profile, accepted] = await Promise.all([this.profiles.findSummary(user.id), LegalService.hasCurrentRequired(user.id)]);
    return { profile, workspaceId, role, legalAcceptanceRequired: !accepted, onboardingComplete: Boolean(profile?.onboardingCompletedAt) };
  }
  async completeOnboarding(userId: string) {
    const profile = await this.profiles.completeOnboarding(userId);
    return { onboardingComplete: true, ...profile };
  }
}
