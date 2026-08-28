import type { NextFunction, Request, Response } from 'express';
import { HandleGmailPush } from '../modules/ingestion/application/handle-gmail-push';
import { PrismaInboxConnectionRepository } from '../modules/ingestion/infrastructure/prisma-inbox-connection.repository';
import { GoogleOidcAdapter } from '../modules/ingestion/providers/google/google-oidc.adapter';

export { decodeGmailPush, validateGooglePushClaims } from '../modules/ingestion/providers/google/gmail-push';
const handler = new HandleGmailPush(new GoogleOidcAdapter(), new PrismaInboxConnectionRepository());

export class GmailPubSubController {
  static async handle(req: Request, res: Response, next: NextFunction) {
    try { await handler.execute(req.header('authorization') || '', req.body); res.status(204).end(); }
    catch (error) { next(error); }
  }
}
