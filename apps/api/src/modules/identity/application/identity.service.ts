import type { AuthenticatedUser } from '../../../types/auth';
import { PRODUCT_GUIDE_VERSION } from '@bills/contracts';

interface ProfileSummary {
  onboardingCompletedAt?: Date | null;
  productGuideVersionSeen: string | null;
  productGuideCompletedVersion: string | null;
  productGuideCompletedAt: Date | null;
  [key: string]: unknown;
}

interface ProfileRepository {
  findSummary(id: string): Promise<ProfileSummary | null>;
  completeOnboarding(id: string): Promise<Record<string, unknown>>;
  updateProductGuide(id: string, version: string, completed: boolean): Promise<ProfileSummary>;
}

interface WorkspaceBootstrapper {
  bootstrap(user: AuthenticatedUser): Promise<Record<string, unknown>>;
}

interface LegalAcceptanceChecker {
  hasCurrentRequired(profileId: string): Promise<boolean>;
}

function productGuide(profile: { productGuideVersionSeen: string | null; productGuideCompletedVersion: string | null; productGuideCompletedAt: Date | null } | null) {
  const completedAt = profile?.productGuideCompletedAt?.toISOString() ?? null;
  return {
    currentVersion: PRODUCT_GUIDE_VERSION,
    versionSeen: profile?.productGuideVersionSeen ?? null,
    completedAt,
    completed: profile?.productGuideCompletedVersion === PRODUCT_GUIDE_VERSION && Boolean(completedAt),
  };
}

export class IdentityApplicationService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly workspaces: WorkspaceBootstrapper,
    private readonly legal: LegalAcceptanceChecker
  ) {}
  async bootstrap(user: AuthenticatedUser) {
    const [workspace, legalAcceptanceRequired, profile] = await Promise.all([
      this.workspaces.bootstrap(user),
      this.legal.hasCurrentRequired(user.id).then((accepted) => !accepted),
      this.profiles.findSummary(user.id),
    ]);
    return { ...workspace, legalAcceptanceRequired, onboardingComplete: Boolean(profile?.onboardingCompletedAt), productGuide: productGuide(profile) };
  }
  async me(user: AuthenticatedUser, workspaceId: string, role?: string) {
    const [profile, accepted] = await Promise.all([
      this.profiles.findSummary(user.id),
      this.legal.hasCurrentRequired(user.id),
    ]);
    return { profile, workspaceId, role, legalAcceptanceRequired: !accepted, onboardingComplete: Boolean(profile?.onboardingCompletedAt), productGuide: productGuide(profile) };
  }
  async completeOnboarding(userId: string) {
    const profile = await this.profiles.completeOnboarding(userId);
    return { onboardingComplete: true, ...profile };
  }
  async updateProductGuide(userId: string, completed: boolean) {
    const profile = await this.profiles.updateProductGuide(userId, PRODUCT_GUIDE_VERSION, completed);
    return productGuide(profile);
  }
}
