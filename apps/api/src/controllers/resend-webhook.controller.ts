import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { HandleResendWebhook } from '../modules/ingestion/application/handle-resend-webhook';
import { PrismaResendEventRepository } from '../modules/ingestion/infrastructure/prisma-resend-event.repository';
import { ResendWebhookAdapter } from '../modules/ingestion/providers/resend/resend-webhook.adapter';

const handler = new HandleResendWebhook(new ResendWebhookAdapter(), new PrismaResendEventRepository());
export class ResendWebhookController {
  static async handle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_WEBHOOK_BODY', 'Webhook body must be raw JSON.');
      const headers = { id: String(req.headers['svix-id'] || ''), timestamp: String(req.headers['svix-timestamp'] || ''), signature: String(req.headers['svix-signature'] || '') };
      if (!headers.id || !headers.timestamp || !headers.signature) throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is missing.');
      const result = await handler.execute(req.body.toString('utf8'), headers);
      if (result === 'created') res.status(202).json({ success: true });
      else res.status(200).json({ success: true, [result]: true });
    } catch (error) { next(error); }
  }
}
