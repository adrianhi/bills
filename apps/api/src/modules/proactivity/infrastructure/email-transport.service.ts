import { logger } from '../../../shared/observability/logger';
import { config } from '../../../config';
import type { ProactiveEmailTransport } from '../application/proactive.ports';

export class EmailTransportError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean, public readonly ambiguous: boolean) {
    super(code); this.name = 'EmailTransportError';
  }
}

export class EmailTransportService implements ProactiveEmailTransport {
  public async sendEmail(options: {
    recipient: string;
    subject: string;
    html: string; text: string; headers?: Record<string, string>; idempotencyKey: string;
  }): Promise<{
    accepted: boolean;
    providerMessageId: string;
    mode: 'SMTP' | 'AUDIT_LOG';
  }> {
    if (config.emailDeliveryMode === 'AUDIT') {
      logger.info('proactive_email_recorded_audit_log', {
        kind: options.idempotencyKey.split('/')[1] || 'unknown', htmlLength: options.html.length,
      });
      return { accepted: true, providerMessageId: `audit:${options.idempotencyKey}`, mode: 'AUDIT_LOG' };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(20_000),
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': options.idempotencyKey,
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: options.recipient,
            subject: options.subject,
            html: options.html,
            text: options.text,
            headers: options.headers,
          }),
        });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        throw new EmailTransportError(`RESEND_HTTP_${res.status}`, retryable, false);
      }
      const body = await res.json() as { id?: string };
      if (!body.id) throw new EmailTransportError('RESEND_RESPONSE_INVALID', true, true);
      logger.info('proactive_email_accepted_by_resend', { providerMessageId: body.id });
      return { accepted: true, providerMessageId: body.id, mode: 'SMTP' };
    } catch (error) {
      if (error instanceof EmailTransportError) throw error;
      logger.warn('resend_dispatch_ambiguous', { errorName: error instanceof Error ? error.name : 'UnknownError' });
      throw new EmailTransportError('RESEND_NETWORK_AMBIGUOUS', true, true);
    }
  }
}
