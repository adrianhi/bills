import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from '../errors/app-error';
import { GmailConnectionService } from './gmail-connection.service';

function subjectHash(profileId: string, email: string) {
  const salt = config.legalAuditSalt || config.ingestionEncryptionKey || 'bills-local-development';
  return crypto.createHmac('sha256', salt).update(`${profileId}:${email}`).digest('hex');
}

export class AccountService {
  public static async exportData(profileId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        legalAcceptances: {
          include: {
            legalDocument: {
              select: { type: true, version: true, locale: true, title: true, contentHash: true },
            },
          },
        },
        integrationConsents: {
          select: {
            provider: true,
            scopes: true,
            disclosureVersion: true,
            grantedAt: true,
            revokedAt: true,
          },
        },
        memberships: {
          include: {
            workspace: {
              include: {
                transactions: true,
                categoryRules: true,
                bankConnections: { include: { institution: true, ingestionAddress: true } },
                inboxConnections: {
                  select: {
                    id: true,
                    provider: true,
                    email: true,
                    status: true,
                    scopes: true,
                    lastSyncedAt: true,
                    lastErrorCode: true,
                    grantedAt: true,
                    revokedAt: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
                ingestionEvents: {
                  select: {
                    id: true,
                    provider: true,
                    providerEventId: true,
                    status: true,
                    parserCode: true,
                    parserVersion: true,
                    errorCode: true,
                    processedAt: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile was not found.');
    return { exportedAt: new Date().toISOString(), profile };
  }

  public static async deleteAccount(profileId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        memberships: {
          include: { workspace: { include: { _count: { select: { members: true } } } } },
        },
      },
    });
    if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile was not found.');

    const inboxConnections = await prisma.inboxConnection.findMany({
      where: { workspace: { members: { some: { profileId } } }, provider: 'GOOGLE' },
      select: { id: true, workspaceId: true },
    });
    for (const connection of inboxConnections) {
      await GmailConnectionService.disconnect(connection.workspaceId, connection.id).catch(() => undefined);
    }

    await prisma.$transaction(async (tx) => {
      for (const membership of profile.memberships) {
        if (membership.workspace._count.members === 1) {
          await tx.workspace.delete({ where: { id: membership.workspaceId } });
        } else {
          await tx.workspaceMember.delete({
            where: {
              workspaceId_profileId: {
                workspaceId: membership.workspaceId,
                profileId,
              },
            },
          });
        }
      }
      await tx.profile.delete({ where: { id: profileId } });
      await tx.accountDeletionAudit.create({
        data: { subjectHash: subjectHash(profileId, profile.email) },
      });
    });
  }
}
