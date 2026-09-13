import crypto from 'node:crypto';
import type { UpdateEmailNotificationPreferencesInput } from '@bills/contracts';
import { AppError } from '../../../errors/app-error';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../domain/unsubscribe-token';
import { nextDigestAt, validTimeZone } from '../domain/email-schedule';
import type { ProactiveEmailRepository, ProactiveEmailTransport } from './proactive.ports';
import { WeeklyEmailBuilder } from './weekly-email.builder';

export interface ProactiveEmailOptions {
  appUrl: string; apiPublicUrl: string; unsubscribeSecret: string;
}

function maskEmail(email?: string | null) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***@***';
  const [name, domain = ''] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export class ProactiveEmailService {
  constructor(
    private readonly repository: ProactiveEmailRepository,
    private readonly transport: ProactiveEmailTransport,
    private readonly weeklyBuilder: WeeklyEmailBuilder,
    private readonly options: ProactiveEmailOptions,
  ) {}

  private present(value: Awaited<ReturnType<ProactiveEmailRepository['getPreferences']>>) {
    return {
      weeklyDigestEnabled: value.weeklyDigestEnabled,
      criticalAlertsEnabled: value.criticalAlertsEnabled,
      digestSchedule: value.digestSchedule,
      timezone: value.timezone,
      recipientMasked: maskEmail(value.email),
    };
  }

  async getPreferences(workspaceId: string, profileId: string) {
    return this.present(await this.repository.getPreferences(workspaceId, profileId));
  }

  async updatePreferences(workspaceId: string, profileId: string, input: UpdateEmailNotificationPreferencesInput) {
    const current = await this.repository.getPreferences(workspaceId, profileId);
    if (!validTimeZone(current.timezone)) throw new AppError(400, 'INVALID_TIMEZONE', 'La zona horaria del perfil no es válida.');
    const keepSchedule = input.weeklyDigestEnabled && current.weeklyDigestEnabled
      && input.digestSchedule === current.digestSchedule && current.nextWeeklyDigestAt && current.nextWeeklyDigestAt > new Date();
    const next = input.weeklyDigestEnabled
      ? (keepSchedule ? current.nextWeeklyDigestAt : nextDigestAt(new Date(), current.timezone, input.digestSchedule))
      : null;
    return this.present(await this.repository.updatePreferences({ workspaceId, profileId, ...input, nextWeeklyDigestAt: next }));
  }

  unsubscribeUrl(workspaceId: string, profileId: string, category: 'WEEKLY_DIGEST' | 'CRITICAL_ALERTS') {
    if (this.options.unsubscribeSecret.length < 32) return '';
    const token = createUnsubscribeToken({ workspaceId, profileId, category }, this.options.unsubscribeSecret);
    return `${this.options.apiPublicUrl}/api/v1/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  async unsubscribe(token: string) {
    const claims = verifyUnsubscribeToken(token, this.options.unsubscribeSecret);
    if (!claims) throw new AppError(400, 'INVALID_UNSUBSCRIBE_TOKEN', 'El enlace de desuscripción no es válido o expiró.');
    await this.repository.disableCategory(claims.workspaceId, claims.profileId, claims.category);
    return claims.category;
  }

  async sendTest(workspaceId: string, profileId: string, currency: 'DOP' | 'USD', now = new Date()) {
    if (await this.repository.testCount(profileId, new Date(now.getTime() - 3_600_000)) >= 3) {
      throw new AppError(429, 'EMAIL_TEST_RATE_LIMIT', 'Puedes enviar hasta tres pruebas por hora.');
    }
    const profile = await this.repository.getPreferences(workspaceId, profileId);
    const unsubscribeUrl = this.unsubscribeUrl(workspaceId, profileId, 'WEEKLY_DIGEST');
    const content = await this.weeklyBuilder.build({
      workspaceId, profileId, recipient: profile.email, displayName: profile.displayName,
      currency, scheduledAt: now, timeZone: profile.timezone, appUrl: this.options.appUrl, unsubscribeUrl,
    });
    const { id } = await this.repository.enqueue({
      workspaceId, profileId, kind: 'TEST', recipient: profile.email, contextKey: crypto.randomUUID(),
      ...content, headers: this.unsubscribeHeaders(unsubscribeUrl),
    });
    const processed = await this.processNext(id, now);
    if (!processed.accepted) throw new AppError(502, 'EMAIL_TEST_FAILED', 'No se pudo aceptar el correo de prueba para envío.');
    return {
      delivered: processed.accepted, recipient: profile.email, subject: content.subject,
      mode: processed.mode!,
    };
  }

  async previewWeekly(workspaceId: string, profileId: string, currency: 'DOP' | 'USD', now = new Date()) {
    const profile = await this.repository.getPreferences(workspaceId, profileId);
    const content = await this.weeklyBuilder.build({
      workspaceId, profileId, recipient: profile.email, displayName: profile.displayName,
      currency, scheduledAt: now, timeZone: profile.timezone, appUrl: this.options.appUrl,
    });
    return {
      subject: content.subject, recipient: profile.email, weekKey: `rolling:${now.toISOString()}`,
      html: content.html, generatedAt: now.toISOString(),
    };
  }

  unsubscribeHeaders(url: string): Record<string, string> {
    return url ? { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {};
  }

  async processNext(id?: string, now = new Date()): Promise<{ processed: boolean; accepted: boolean; mode?: 'SMTP' | 'AUDIT_LOG' }> {
    const job = await this.repository.claim(id);
    if (!job) return { processed: false, accepted: false };
    try {
      if (!job.html || !job.text) throw Object.assign(new Error('EMAIL_PAYLOAD_MISSING'), { retryable: false });
      const result = await this.transport.sendEmail({
        recipient: job.recipient, subject: job.subject, html: job.html, text: job.text,
        headers: job.headers || undefined, idempotencyKey: `cuadre/${job.id}`,
      });
      await this.repository.accepted(job, result.providerMessageId);
      return { processed: true, accepted: result.accepted, mode: result.mode };
    } catch (error) {
      const detail = error as { code?: string; message?: string; retryable?: boolean; ambiguous?: boolean };
      const safeCode = typeof detail.code === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(detail.code)
        ? detail.code : 'EMAIL_SEND_FAILED';
      await this.repository.failed(job, {
        code: safeCode,
        retryable: detail.retryable ?? true, ambiguous: detail.ambiguous ?? false,
      }, now);
      return { processed: true, accepted: false };
    }
  }

  recordProviderEvent(input: { providerEventId: string; providerMessageId: string; type: string; occurredAt: Date }) {
    return this.repository.recordProviderEvent(input);
  }

  prunePayloads(now = new Date()) {
    return this.repository.prunePayloads(new Date(now.getTime() - 7 * 86_400_000));
  }
}
