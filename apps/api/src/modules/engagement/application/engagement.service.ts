import type { RecordProductViewInput } from '@bills/contracts';
import type { EngagementRepository } from './engagement.ports';

const RETENTION_MONTHS = 13;

export class EngagementService {
  constructor(private readonly repository: EngagementRepository) {}

  async recordView(workspaceId: string, profileId: string, input: RecordProductViewInput) {
    await this.recordAction({ workspaceId, profileId, ...input });
  }

  async recordAction(input: {
    workspaceId: string; profileId: string; name: string; contextKey: string;
    properties?: Record<string, string | number | boolean>;
  }) {
    await this.repository.record(input);
    await this.pruneExpired();
  }

  async pruneExpired() {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
    await this.repository.removeExpired(cutoff);
  }
}
