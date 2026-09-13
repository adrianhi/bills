import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { EmailDeliveryRecord, EmailPreferenceRecord, ProactiveEmailRepository } from '../application/proactive.ports';
import { decideEmailFailure } from '../domain/email-retry';

const preferenceSelect = {
  workspaceId: true, profileId: true, weeklyDigestEnabled: true, criticalAlertsEnabled: true,
  digestSchedule: true, nextWeeklyDigestAt: true,
  membership: { select: { profile: { select: { email: true, displayName: true, timezone: true, defaultCurrency: true } } } },
} as const;

function preference(row: Prisma.EmailNotificationPreferenceGetPayload<{ select: typeof preferenceSelect }>): EmailPreferenceRecord {
  return { ...row, ...row.membership.profile, digestSchedule: row.digestSchedule as EmailPreferenceRecord['digestSchedule'] };
}

export class PrismaEmailRepository implements ProactiveEmailRepository {
  async getPreferences(workspaceId: string, profileId: string) {
    const row = await prisma.emailNotificationPreference.upsert({
      where: { workspaceId_profileId: { workspaceId, profileId } }, update: {},
      create: { workspaceId, profileId }, select: preferenceSelect,
    });
    return preference(row);
  }

  async updatePreferences(input: Parameters<ProactiveEmailRepository['updatePreferences']>[0]) {
    const row = await prisma.emailNotificationPreference.upsert({
      where: { workspaceId_profileId: { workspaceId: input.workspaceId, profileId: input.profileId } },
      create: input, update: {
        weeklyDigestEnabled: input.weeklyDigestEnabled, criticalAlertsEnabled: input.criticalAlertsEnabled,
        digestSchedule: input.digestSchedule, nextWeeklyDigestAt: input.nextWeeklyDigestAt,
      }, select: preferenceSelect,
    });
    return preference(row);
  }

  async disableCategory(workspaceId: string, profileId: string, category: 'WEEKLY_DIGEST' | 'CRITICAL_ALERTS') {
    const [result] = await prisma.$transaction([
      prisma.emailNotificationPreference.updateMany({
        where: { workspaceId, profileId }, data: category === 'WEEKLY_DIGEST'
          ? { weeklyDigestEnabled: false, nextWeeklyDigestAt: null }
          : { criticalAlertsEnabled: false },
      }),
      prisma.productEvent.upsert({ where: { workspaceId_profileId_name_contextKey: {
        workspaceId, profileId, name: 'EMAIL_UNSUBSCRIBED', contextKey: category,
      } }, create: { workspaceId, profileId, name: 'EMAIL_UNSUBSCRIBED', contextKey: category }, update: { occurredAt: new Date() } }),
    ]);
    return result.count > 0;
  }

  async dueWeekly(now: Date, limit: number) {
    const rows = await prisma.emailNotificationPreference.findMany({
      where: { weeklyDigestEnabled: true, nextWeeklyDigestAt: { lte: now } },
      select: preferenceSelect, orderBy: { nextWeeklyDigestAt: 'asc' }, take: limit,
    });
    return rows.map(preference);
  }

  async alertAudiences(limit: number) {
    const rows = await prisma.emailNotificationPreference.findMany({
      where: { criticalAlertsEnabled: true }, select: preferenceSelect, orderBy: { lastCriticalScanAt: 'asc' }, take: limit,
    });
    return rows.map(preference);
  }

  async markAlertsEvaluated(workspaceId: string, profileId: string, at: Date) {
    await prisma.$executeRaw`UPDATE "email_notification_preferences"
      SET "last_critical_scan_at" = ${at}
      WHERE "workspace_id" = ${workspaceId}::uuid AND "profile_id" = ${profileId}::uuid`;
  }

  async advanceWeekly(workspaceId: string, profileId: string, next: Date) {
    await prisma.emailNotificationPreference.update({
      where: { workspaceId_profileId: { workspaceId, profileId } }, data: { nextWeeklyDigestAt: next },
    });
  }

  async enqueue(input: Parameters<ProactiveEmailRepository['enqueue']>[0]) {
    try {
      const delivery = await prisma.emailDelivery.create({ data: {
        ...input, kind: input.kind as never, headers: input.headers,
      }, select: { id: true } });
      return { id: delivery.id, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const delivery = await prisma.emailDelivery.findUniqueOrThrow({ where: { workspaceId_profileId_kind_contextKey: {
        workspaceId: input.workspaceId, profileId: input.profileId, kind: input.kind as never, contextKey: input.contextKey,
      } }, select: { id: true } });
      return { id: delivery.id, created: false };
    }
  }

  async claim(id?: string): Promise<EmailDeliveryRecord | null> {
    const now = new Date();
    const row = await prisma.emailDelivery.findFirst({ where: {
      ...(id ? { id } : {}), nextAttemptAt: { lte: now },
      OR: [{ status: 'PENDING' }, { status: 'FAILED', processedAt: null }, { status: 'PROCESSING', leaseUntil: { lt: now } }],
    }, orderBy: { nextAttemptAt: 'asc' } });
    if (!row) return null;
    const leaseToken = crypto.randomUUID();
    const claimed = await prisma.emailDelivery.updateMany({ where: {
      id: row.id, nextAttemptAt: { lte: now },
      OR: [{ status: 'PENDING' }, { status: 'FAILED', processedAt: null }, { status: 'PROCESSING', leaseUntil: { lt: now } }],
    }, data: { status: 'PROCESSING', leaseToken, leaseUntil: new Date(now.getTime() + 60_000), attempts: { increment: 1 } } });
    if (!claimed.count) return null;
    const headers = row.headers && typeof row.headers === 'object' && !Array.isArray(row.headers)
      ? row.headers as Record<string, string> : null;
    return { ...row, headers, attempts: row.attempts + 1, leaseToken };
  }

  async accepted(job: EmailDeliveryRecord, providerMessageId: string) {
    await prisma.$transaction(async (tx) => {
      const result = await tx.emailDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: {
        status: 'ACCEPTED', providerMessageId, acceptedAt: new Date(), processedAt: new Date(),
        leaseToken: null, leaseUntil: null, errorCode: null,
      } });
      if (!result.count) throw new Error('EMAIL_DELIVERY_LEASE_LOST');
      await tx.productEvent.upsert({ where: { workspaceId_profileId_name_contextKey: {
        workspaceId: job.workspaceId, profileId: job.profileId, name: 'EMAIL_ACCEPTED', contextKey: job.id,
      } }, create: { workspaceId: job.workspaceId, profileId: job.profileId, name: 'EMAIL_ACCEPTED', contextKey: job.id }, update: {} });
    });
  }

  async failed(job: EmailDeliveryRecord, error: { code: string; retryable: boolean; ambiguous: boolean }, now: Date) {
    const decision = decideEmailFailure({ ...job, ...error, now });
    await prisma.emailDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: {
      status: decision.status, errorCode: error.code, leaseToken: null, leaseUntil: null,
      processedAt: decision.terminal ? now : null, nextAttemptAt: decision.retryAt || now,
    } });
  }

  testCount(profileId: string, since: Date) {
    return prisma.emailDelivery.count({ where: { profileId, kind: 'TEST', createdAt: { gte: since } } });
  }

  async recordProviderEvent(input: Parameters<ProactiveEmailRepository['recordProviderEvent']>[0]) {
    const delivery = await prisma.emailDelivery.findUnique({ where: { providerMessageId: input.providerMessageId } });
    if (!delivery) return false;
    const statusByType = {
      'email.delivered': 'DELIVERED', 'email.failed': 'FAILED', 'email.bounced': 'BOUNCED',
      'email.complained': 'COMPLAINED', 'email.suppressed': 'SUPPRESSED',
    } as const;
    const status = statusByType[input.type as keyof typeof statusByType];
    if (!status) return false;
    const allowedFrom: Array<'ACCEPTED' | 'DELIVERED'> = status === 'COMPLAINED'
      ? ['ACCEPTED', 'DELIVERED'] : ['ACCEPTED'];
    try {
      await prisma.$transaction(async (tx) => {
        await tx.emailDeliveryEvent.create({
          data: {
            deliveryId: delivery.id,
            providerEventId: input.providerEventId,
            type: input.type,
            occurredAt: input.occurredAt,
          },
        });
        await tx.emailDelivery.updateMany({ where: { id: delivery.id, status: { in: allowedFrom } }, data: {
          status, ...(status === 'DELIVERED' ? { deliveredAt: input.occurredAt } : {}), processedAt: input.occurredAt,
        } });
        if (status === 'BOUNCED' || status === 'COMPLAINED' || status === 'SUPPRESSED') {
          await tx.emailNotificationPreference.updateMany({ where: { profileId: delivery.profileId }, data: {
            weeklyDigestEnabled: false, criticalAlertsEnabled: false, nextWeeklyDigestAt: null,
          } });
        }
        await tx.productEvent.upsert({ where: { workspaceId_profileId_name_contextKey: {
          workspaceId: delivery.workspaceId, profileId: delivery.profileId, name: `EMAIL_${status}`, contextKey: input.providerEventId,
        } }, create: { workspaceId: delivery.workspaceId, profileId: delivery.profileId, name: `EMAIL_${status}`, contextKey: input.providerEventId }, update: {} });
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
  }

  async prunePayloads(before: Date) {
    const retention = new Date(); retention.setUTCMonth(retention.getUTCMonth() - 13);
    const [updated] = await prisma.$transaction([
      prisma.emailDelivery.updateMany({
        where: { processedAt: { lt: before }, status: { in: ['ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED', 'UNKNOWN'] } },
        data: { html: null, text: null, headers: Prisma.DbNull },
      }),
      prisma.emailDelivery.deleteMany({ where: { processedAt: { lt: retention } } }),
    ]);
    return updated.count;
  }
}
