import { AppError } from '../../../errors/app-error';
import type { GmailSyncOperations } from '../../connections';
import type { IngestionJobKind, JobPayload } from './ingestion-job.port';

interface JobContext {
  workspaceId: string;
  inboxConnectionId: string;
  payload: JobPayload;
}

type JobHandler = (context: JobContext) => Promise<unknown>;

export class GmailJobHandlerRegistry {
  private readonly handlers: Partial<Record<IngestionJobKind, JobHandler>>;

  public constructor(sync: GmailSyncOperations) {
    this.handlers = {
      GMAIL_INITIAL_BACKFILL: ({ workspaceId, inboxConnectionId }) =>
        sync.syncFull(workspaceId, inboxConnectionId, true),
      GMAIL_BANK_BACKFILL: ({ workspaceId, inboxConnectionId, payload }) => {
        if (!payload.institutionCode) {
          throw new AppError(400, 'BANK_BACKFILL_INVALID', 'Bank backfill is missing its institution.');
        }
        return sync.syncBankBackfill(workspaceId, inboxConnectionId, payload.institutionCode);
      },
      GMAIL_WATCH_RENEWAL: ({ workspaceId, inboxConnectionId }) =>
        sync.registerWatch(workspaceId, inboxConnectionId),
      GMAIL_FAILED_REPLAY: ({ workspaceId, inboxConnectionId, payload }) =>
        sync.replayFailed(workspaceId, inboxConnectionId, {
          bank: payload.bank,
          errors: payload.errors,
          parserVersion: payload.parserVersion,
          statuses: payload.statuses,
        }),
      GMAIL_HISTORY_SYNC: ({ workspaceId, inboxConnectionId }) =>
        sync.syncIncremental(workspaceId, inboxConnectionId),
      GMAIL_RECONCILIATION: ({ workspaceId, inboxConnectionId }) =>
        sync.syncIncremental(workspaceId, inboxConnectionId),
    };
  }

  public async execute(type: IngestionJobKind, context: JobContext): Promise<unknown> {
    const handler = this.handlers[type];
    if (!handler) throw new AppError(500, 'INGESTION_HANDLER_MISSING', `No handler is registered for ${type}.`);
    return handler(context);
  }
}
