import type { UpdateRecurringBillInput } from '@bills/contracts';
import type { RecurringActionRecorder, RecurringRepository } from './recurring.ports';

export class RecurringService {
  constructor(private readonly repository: RecurringRepository, private readonly events?: RecurringActionRecorder) {}

  async radar(workspaceId: string, currency: 'DOP' | 'USD', window: number) {
    await this.repository.ensureScanScheduled(workspaceId);
    return this.repository.radar(workspaceId, currency, window);
  }

  async update(workspaceId: string, profileId: string, id: string, input: UpdateRecurringBillInput) {
    const result = await this.repository.update(workspaceId, id, input);
    if (result) await this.events?.recordAction({
      workspaceId, profileId,
      name: input.status === 'CONFIRMED' ? 'RECURRING_CONFIRMED' : 'RECURRING_EDITED',
      contextKey: `${id}:${input.status || 'details'}`,
      properties: { currency: result.currency, status: result.status },
    });
    return result;
  }

  acknowledgeAlert(workspaceId: string, id: string) {
    return this.repository.acknowledgeAlert(workspaceId, id);
  }

  sumFutureThroughMonthEnd(workspaceId: string, currency: string, today: string) {
    return this.repository.sumFutureThroughMonthEnd(workspaceId, currency, today);
  }

  sumFutureThrough(workspaceId: string, currency: string, after: string, through: string) {
    return this.repository.sumFutureThrough(workspaceId, currency, after, through);
  }
}
