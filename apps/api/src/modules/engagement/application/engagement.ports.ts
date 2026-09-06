export interface EngagementRepository {
  record(input: {
    workspaceId: string;
    profileId: string;
    name: string;
    contextKey: string;
    properties?: Record<string, string | number | boolean>;
  }): Promise<void>;
  removeExpired(before: Date): Promise<void>;
}
