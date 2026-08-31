export interface GmailConnectionLifecycle {
  createAuthorizationUrl(
    workspaceId: string,
    profileId: string,
    institutionCodes: string[],
    returnTo?: string
  ): Promise<string>;
  completeAuthorization(code: string, state: string): Promise<{ connection: Record<string, unknown>; returnTo: string }>;
  callbackRedirect(returnTo: string, code?: string): string;
  list(workspaceId: string): Promise<Array<Record<string, unknown>>>;
  disconnect(workspaceId: string, connectionId: string): Promise<void>;
}

export interface GmailSyncOperations {
  syncFull(workspaceId: string, connectionId: string, initial?: boolean): Promise<unknown>;
  syncBankBackfill(workspaceId: string, connectionId: string, institutionCode: string): Promise<unknown>;
  syncIncremental(workspaceId: string, connectionId: string): Promise<unknown>;
  registerWatch(workspaceId: string, connectionId: string): Promise<unknown>;
  replayFailed(workspaceId: string, connectionId: string, filters?: GmailReplayFilters): Promise<unknown>;
}

export interface GmailReplayFilters {
  bank?: string;
  errors?: string[];
  parserVersion?: string;
  statuses?: Array<'FAILED' | 'IGNORED'>;
}
