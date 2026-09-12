import type { Request, Response } from 'express';
import { AppError } from '../../../errors/app-error';
import { config } from '../../../config';
import type { ProactiveEmailService } from '../application/proactive-email.service';
import { verifyResendWebhook } from '../infrastructure/resend-webhook-verifier';

export class EmailNotificationController {
  constructor(private readonly service: ProactiveEmailService) {}

  unsubscribeGet = async (req: Request, res: Response) => {
    const category = await this.service.unsubscribe(String(req.query.token || ''));
    const label = category === 'WEEKLY_DIGEST' ? 'el Pulso Semanal' : 'las alertas críticas';
    res.status(200).type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preferencia actualizada</title></head><body style="font-family:system-ui;max-width:560px;margin:64px auto;padding:24px"><h1>Preferencia actualizada</h1><p>Ya no recibirás ${label} de este espacio.</p><p>Puedes volver a activarlos desde los ajustes de Cuadre.</p></body></html>`);
  };

  unsubscribePost = async (req: Request, res: Response) => {
    await this.service.unsubscribe(String(req.query.token || ''));
    res.status(204).send();
  };

  resendWebhook = async (req: Request, res: Response) => {
    if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_WEBHOOK_BODY', 'Raw webhook body required.');
    const event = verifyResendWebhook({
      payload: req.body, id: req.header('svix-id') || undefined,
      timestamp: req.header('svix-timestamp') || undefined,
      signature: req.header('svix-signature') || undefined, secret: config.resendWebhookSecret,
    });
    if (!event?.data.email_id) throw new AppError(400, 'INVALID_RESEND_SIGNATURE', 'Invalid Resend webhook.');
    const occurredAt = new Date(event.created_at);
    if (!Number.isFinite(occurredAt.getTime())) throw new AppError(400, 'INVALID_RESEND_EVENT_DATE', 'Invalid Resend event date.');
    await this.service.recordProviderEvent({
      providerEventId: req.header('svix-id')!, providerMessageId: event.data.email_id,
      type: event.type, occurredAt,
    });
    res.status(200).json({ received: true });
  };
}
