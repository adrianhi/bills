import type { NextFunction, Request, Response } from 'express';
import type { HandleGmailPush } from '../modules/ingestion/application/handle-gmail-push';

export { decodeGmailPush, validateGooglePushClaims } from '../modules/ingestion/providers/google/gmail-push';

export class GmailPubSubController {
  public constructor(private readonly handler: HandleGmailPush) {}

  public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.handler.execute(req.header('authorization') || '', req.body);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
