import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { config } from '../../../config';
import type { AuthenticatedUser } from '../../../types/auth';
import { AppError } from '../../../errors/app-error';

export class WorkspaceService {
  public static async bootstrap(user: AuthenticatedUser) {
    const normalizedEmail = user.email.trim().toLowerCase();

    // Fast-path: if membership already exists, return immediately without locks
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { profileId: user.id },
      include: { workspace: true },
    });
    if (existingMembership) {
      return {
        profileId: user.id,
        workspace: existingMembership.workspace,
        role: existingMembership.role,
        claimedLegacyData: false,
      };
    }

    return prisma.$transaction(
      async (tx) => {
        // Handle case where profile exists for this email with a different auth user id
        const existingProfileByEmail = await tx.profile.findUnique({
          where: { email: normalizedEmail },
          include: { memberships: true },
        });

        if (existingProfileByEmail && existingProfileByEmail.id !== user.id) {
          const workspaceIds = existingProfileByEmail.memberships.map((m) => ({
            workspaceId: m.workspaceId,
            role: m.role,
          }));

          await tx.profile.delete({ where: { id: existingProfileByEmail.id } });

          await tx.profile.create({
            data: {
              id: user.id,
              email: normalizedEmail,
              displayName: user.displayName || existingProfileByEmail.displayName,
              timezone: existingProfileByEmail.timezone,
              defaultCurrency: existingProfileByEmail.defaultCurrency,
              onboardingCompletedAt: existingProfileByEmail.onboardingCompletedAt,
              productGuideVersionSeen: existingProfileByEmail.productGuideVersionSeen,
              productGuideCompletedVersion: existingProfileByEmail.productGuideCompletedVersion,
              productGuideCompletedAt: existingProfileByEmail.productGuideCompletedAt,
            },
          });

          for (const m of workspaceIds) {
            await tx.workspaceMember.create({
              data: {
                workspaceId: m.workspaceId,
                profileId: user.id,
                role: m.role,
              },
            });
          }
        } else {
          await tx.profile.upsert({
            where: { id: user.id },
            update: {
              email: normalizedEmail,
              ...(user.displayName ? { displayName: user.displayName } : {}),
            },
            create: {
              id: user.id,
              email: normalizedEmail,
              displayName: user.displayName,
            },
          });
        }

        const currentMembership = await tx.workspaceMember.findFirst({
          where: { profileId: user.id },
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        });

        if (currentMembership) {
          return {
            profileId: user.id,
            workspace: currentMembership.workspace,
            role: currentMembership.role,
            claimedLegacyData: false,
          };
        }

        const shouldClaimLegacy =
          Boolean(config.legacyOwnerEmail) && normalizedEmail === config.legacyOwnerEmail;
        const invite = (shouldClaimLegacy || !config.requireBetaInvite)
          ? null
          : await tx.betaInvite.findUnique({ where: { email: normalizedEmail } });

        if (config.requireBetaInvite && !shouldClaimLegacy && (!invite || invite.usedAt)) {
          throw new AppError(
            403,
            'BETA_INVITE_REQUIRED',
            'Esta beta es por invitación. Solicita acceso antes de crear tu espacio.'
          );
        }

        const workspace = await tx.workspace.create({
          data: {
            name: user.displayName?.trim() || normalizedEmail.split('@')[0] || 'Mi espacio',
            members: {
              create: {
                profileId: user.id,
                role: 'OWNER',
              },
            },
          },
        });

        if (shouldClaimLegacy) {
          await Promise.all([
            tx.transaction.updateMany({
              where: { workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.categoryRule.updateMany({
              where: { workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
          ]);
        } else if (invite) {
          await tx.betaInvite.update({
            where: { id: invite.id },
            data: { usedAt: new Date() },
          });
        }

        return {
          profileId: user.id,
          workspace,
          role: 'OWNER' as const,
          claimedLegacyData: shouldClaimLegacy,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  public static async findMembership(profileId: string, requestedWorkspaceId?: string) {
    return prisma.workspaceMember.findFirst({
      where: {
        profileId,
        ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
      },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
