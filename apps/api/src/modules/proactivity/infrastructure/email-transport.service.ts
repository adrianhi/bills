import { logger } from '../../../shared/observability/logger';
import type { ProactiveEmailTransport } from '../application/proactive.ports';

export class EmailTransportService implements ProactiveEmailTransport {
  public async sendEmail(options: {
    recipient: string;
    subject: string;
    html: string;
  }): Promise<{
    delivered: boolean;
    recipient: string;
    subject: string;
    mode: 'SMTP' | 'AUDIT_LOG';
  }> {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'bills. <notificaciones@bills.local>',
            to: options.recipient,
            subject: options.subject,
            html: options.html,
          }),
        });
        if (res.ok) {
          logger.info('weekly_digest_sent_via_resend', { recipient: options.recipient });
          return { delivered: true, recipient: options.recipient, subject: options.subject, mode: 'SMTP' };
        }
      } catch (err) {
        logger.warn('resend_dispatch_failed_falling_back', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Default development / test audit mode
    logger.info('weekly_digest_recorded_audit_log', {
      recipient: options.recipient,
      subject: options.subject,
      htmlLength: options.html.length,
    });

    return {
      delivered: true,
      recipient: options.recipient,
      subject: options.subject,
      mode: 'AUDIT_LOG',
    };
  }
}
