import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { AppError } from '../errors/app-error';
import { GmailConnectionService } from '../services/gmail-connection.service';
import { IngestionJobService } from '../services/ingestion-job.service';

const StartGoogleSchema = z.object({
  returnTo: z.string().max(200).optional(),
});

export class InboxConnectionController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        data: await GmailConnectionService.list(req.auth!.workspaceId!),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async startGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const input = StartGoogleSchema.parse(req.body);
      const authorizationUrl = await GmailConnectionService.createAuthorizationUrl(
        req.auth!.workspaceId!,
        req.auth!.user.id,
        input.returnTo
      );
      res.status(200).json({ success: true, data: { authorizationUrl } });
    } catch (error) {
      next(error);
    }
  }

  public static async googleCallback(req: Request, res: Response) {
    const fallbackReturnTo = '/onboarding';
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
      if (oauthError) {
        res.redirect(GmailConnectionService.callbackRedirect(fallbackReturnTo, 'GOOGLE_ACCESS_DENIED'));
        return;
      }
      if (!code || !state) {
        throw new AppError(400, 'INVALID_OAUTH_CALLBACK', 'Google callback is incomplete.');
      }
      const result = await GmailConnectionService.completeAuthorization(code, state);
      const connection = result.connection as { id: string; workspaceId: string };
      await IngestionJobService.enqueueInitial(connection.workspaceId, connection.id);
      if (config.googlePubSubTopic) await IngestionJobService.enqueueWatch(connection.workspaceId, connection.id);
      res.redirect(GmailConnectionService.callbackRedirect(result.returnTo));
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'GOOGLE_OAUTH_FAILED';
      const target = new URL(fallbackReturnTo, config.appUrl);
      target.searchParams.set('gmail', 'error');
      target.searchParams.set('code', code);
      res.redirect(target.toString());
    }
  }

  public static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await IngestionJobService.enqueueManual(
        req.auth!.workspaceId!,
        String(req.params.id)
      );
      res.status(202).json({ success: true, data: { jobId: job.id, status: 'QUEUED' } });
    } catch (error) {
      next(error);
    }
  }

  public static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await GmailConnectionService.disconnect(req.auth!.workspaceId!, String(req.params.id));
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
