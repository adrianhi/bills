export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export interface GmailProfile {
  emailAddress: string;
  historyId?: string;
}

export interface GmailMessagePart {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

export interface GmailHistoryPage {
  history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>;
  nextPageToken?: string;
  historyId?: string;
}

export interface GmailMessagePage {
  messages?: Array<{ id: string }>;
  nextPageToken?: string;
}

export interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

export interface SyncSummary {
  scanned: number;
  parsed: number;
  created: number;
  duplicates: number;
  ignored: number;
  failed: number;
}

export interface GmailReplayFilters {
  bank?: string;
  errors?: string[];
  parserVersion?: string;
  statuses?: Array<'FAILED' | 'IGNORED'>;
}

export function emptySyncSummary(): SyncSummary {
  return { scanned: 0, parsed: 0, created: 0, duplicates: 0, ignored: 0, failed: 0 };
}
