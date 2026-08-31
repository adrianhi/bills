export type IngestionJobKind =
  | 'GMAIL_INITIAL_BACKFILL'
  | 'GMAIL_HISTORY_SYNC'
  | 'GMAIL_RECONCILIATION'
  | 'GMAIL_WATCH_RENEWAL'
  | 'GMAIL_FAILED_REPLAY'
  | 'GMAIL_BANK_BACKFILL';

export interface JobPayload {
  historyId?: string;
  pubsubMessageId?: string;
  bank?: string;
  errors?: string[];
  parserVersion?: string;
  statuses?: Array<'FAILED' | 'IGNORED'>;
  institutionCode?: string;
}

export interface EnqueueJobInput {
  workspaceId: string;
  inboxConnectionId: string;
  type: IngestionJobKind;
  dedupeKey: string;
  payload?: JobPayload;
}

export interface IngestionJobQueue {
  enqueue(input: EnqueueJobInput): Promise<unknown>;
  enqueueInitial(workspaceId: string, inboxConnectionId: string): Promise<{ id: string }>;
  enqueueWatch(workspaceId: string, inboxConnectionId: string): Promise<{ id: string }>;
  enqueueBankBackfill(workspaceId: string, inboxConnectionId: string, institutionCode: string): Promise<{ id: string }>;
  enqueueManual(workspaceId: string, inboxConnectionId: string): Promise<{ id: string }>;
  enqueuePush(workspaceId: string, inboxConnectionId: string, pubsubMessageId: string, historyId: string): Promise<unknown>;
  enqueueReplay(workspaceId: string, inboxConnectionId: string, filters?: Partial<JobPayload>): Promise<unknown>;
}

export interface IngestionJobProcessor {
  scheduleDue(now?: Date): Promise<void>;
  processNext(onlyJobIds?: string[]): Promise<boolean>;
}
