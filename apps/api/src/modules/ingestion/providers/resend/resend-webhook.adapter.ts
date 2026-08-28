import { Resend } from 'resend';
import { config } from '../../../../config';
import { AppError } from '../../../../errors/app-error';

export class ResendWebhookAdapter {
  verify(payload: string, headers: { id: string; timestamp: string; signature: string }) {
    if (!config.resendWebhookSecret) throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'The inbound webhook is not configured.');
    return new Resend(config.resendApiKey || 're_verification_only').webhooks.verify({ payload, headers, webhookSecret: config.resendWebhookSecret });
  }
}
