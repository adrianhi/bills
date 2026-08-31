import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { AppError } from '../errors/app-error';
import type { GmailConnectionLifecycle } from '../modules/connections/application/gmail-connection.port';
import type { IngestionJobQueue } from '../modules/ingestion/application/ingestion-job.port';

const StartGoogleSchema = z.object({
  returnTo: z.string().max(200).optional(),
  institutionCodes: z.array(z.string().trim().min(2).max(32)).min(1),
});
const InstitutionSelectionSchema = StartGoogleSchema.pick({ institutionCodes: true });

interface InstitutionSelection {
  replace(workspaceId: string, connectionId: string, codes: string[]): Promise<{
    selectedInstitutionCodes: string[];
    addedInstitutionCodes: string[];
  }>;
}

export class InboxConnectionController {
  public constructor(
    private readonly gmail: GmailConnectionLifecycle,
    private readonly jobs: IngestionJobQueue,
    private readonly institutions: InstitutionSelection
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, data: await this.gmail.list(req.auth!.workspaceId!) });
    } catch (error) {
      next(error);
    }
  };

  public startGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = StartGoogleSchema.parse(req.body);
      const authorizationUrl = await this.gmail.createAuthorizationUrl(
        req.auth!.workspaceId!, req.auth!.user.id, input.institutionCodes, input.returnTo
      );
      res.status(200).json({ success: true, data: { authorizationUrl } });
    } catch (error) {
      next(error);
    }
  };

  public updateInstitutions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = InstitutionSelectionSchema.parse(req.body);
      const connectionId = String(req.params.id);
      const result = await this.institutions.replace(req.auth!.workspaceId!, connectionId, input.institutionCodes);
      const jobs = await Promise.all(result.addedInstitutionCodes.map((institutionCode) =>
        this.jobs.enqueueBankBackfill(req.auth!.workspaceId!, connectionId, institutionCode)
      ));
      res.status(200).json({
        success: true,
        data: { selectedInstitutionCodes: result.selectedInstitutionCodes, queuedJobIds: jobs.map((job) => job.id) },
      });
    } catch (error) {
      next(error);
    }
  };

  public googleCallback = async (req: Request, res: Response): Promise<void> => {
    const fallbackReturnTo = '/onboarding';
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
      if (oauthError) {
        res.redirect(this.gmail.callbackRedirect(fallbackReturnTo, 'GOOGLE_ACCESS_DENIED'));
        return;
      }
      if (!code || !state) throw new AppError(400, 'INVALID_OAUTH_CALLBACK', 'Google callback is incomplete.');
      const result = await this.gmail.completeAuthorization(code, state);
      const connection = result.connection as { id: string; workspaceId: string };
      await this.jobs.enqueueInitial(connection.workspaceId, connection.id);
      if (config.googlePubSubTopic) await this.jobs.enqueueWatch(connection.workspaceId, connection.id);
      res.redirect(this.gmail.callbackRedirect(result.returnTo));
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'GOOGLE_OAUTH_FAILED';
      const target = new URL(fallbackReturnTo, config.appUrl);
      target.searchParams.set('gmail', 'error');
      target.searchParams.set('code', code);
      res.redirect(target.toString());
    }
  };

  public sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await this.jobs.enqueueManual(req.auth!.workspaceId!, String(req.params.id));
      res.status(202).json({ success: true, data: { jobId: job.id, status: 'QUEUED' } });
    } catch (error) {
      next(error);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.gmail.disconnect(req.auth!.workspaceId!, String(req.params.id));
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
