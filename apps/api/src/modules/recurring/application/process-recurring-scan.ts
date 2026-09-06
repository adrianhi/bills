import { detectRecurring } from '../domain/recurring-detection';
import type { RecurringRepository } from './recurring.ports';

export class ProcessRecurringScan {
  constructor(private readonly repository: RecurringRepository) {}

  async batch(workspaceId: string, index: number, batchSize = 25) {
    const candidates = await this.repository.candidates(workspaceId);
    const batch = candidates.slice(index, index + batchSize);
    for (const candidate of batch) {
      const detection = detectRecurring(await this.repository.observations(workspaceId, candidate));
      if (detection) await this.repository.saveDetection(workspaceId, candidate, detection);
    }
    return { complete: index + batch.length >= candidates.length, nextCursor: index + batch.length };
  }
}
