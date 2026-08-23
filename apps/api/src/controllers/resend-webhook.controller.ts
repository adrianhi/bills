import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from '../errors/app-error';

function extractLocalPart(address: string) {
  const match = address.toLowerCase().match(/<?([^<>\s]+)@([^<>\s]+)>?/);
  return match?.[1] || '';
}

export class ResendWebhookController {
  public static async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!config.resendWebhookSecret) {
        throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'The inbound webhook is not configured.');
      }
      if (!Buffer.isBuffer(req.body)) {
        throw new AppError(400, 'INVALID_WEBHOOK_BODY', 'Webhook body must be raw JSON.');
      }

      const eventId = String(req.headers['svix-id'] || '');
      const timestamp = String(req.headers['svix-timestamp'] || '');
      const signature = String(req.headers['svix-signature'] || '');
      if (!eventId || !timestamp || !signature) {
        throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is missing.');
      }

      const resend = new Resend(config.resendApiKey || 're_verification_only');
      const event = resend.webhooks.verify({
        payload: req.body.toString('utf8'),
        headers: { id: eventId, timestamp, signature },
        webhookSecret: config.resendWebhookSecret,
      });

      if (event.type !== 'email.received') {
        res.status(200).json({ success: true, ignored: true });
        return;
      }

      const recipients = event.data.to || [];
      const localParts = recipients.map(extractLocalPart).filter(Boolean);
      const address = await prisma.ingestionAddress.findFirst({
        where: { aliasToken: { in: localParts }, isActive: true },
        include: { bankConnection: true },
      });

      if (!address) {
        res.status(200).json({ success: true, ignored: true });
        return;
      }

      try {
        await prisma.ingestionEvent.create({
          data: {
            workspaceId: address.bankConnection.workspaceId,
            bankConnectionId: address.bankConnectionId,
            providerEventId: eventId,
            providerEmailId: event.data.email_id,
            status: 'PENDING',
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          res.status(200).json({ success: true, duplicate: true });
          return;
        }
        throw error;
      }

      res.status(202).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
