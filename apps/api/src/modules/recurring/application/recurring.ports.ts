import type { CreateRecurringBillInput, RecurringBillDto, RecurringRadarDto, UpdateRecurringBillInput } from '@bills/contracts';
import type { RecurringDetection } from '../domain/recurring-detection';

export interface RecurringCandidate {
  identityKey: string;
  displayName: string;
  currency: string;
  merchantKey: string | null;
}

export interface RecurringRepository {
  ensureScanScheduled(workspaceId: string): Promise<void>;
  radar(workspaceId: string, currency: 'DOP' | 'USD', window: number): Promise<RecurringRadarDto>;
  create(workspaceId: string, input: CreateRecurringBillInput): Promise<RecurringBillDto>;
  update(workspaceId: string, id: string, input: UpdateRecurringBillInput): Promise<RecurringBillDto | null>;
  acknowledgeAlert(workspaceId: string, id: string): Promise<boolean>;
  sumFutureThroughMonthEnd(workspaceId: string, currency: string, today: string): Promise<number>;
  sumFutureThrough(workspaceId: string, currency: string, after: string, through: string): Promise<number>;
  candidates(workspaceId: string): Promise<RecurringCandidate[]>;
  observations(workspaceId: string, candidate: RecurringCandidate): Promise<RecurringDetection['observations']>;
  saveDetection(workspaceId: string, candidate: RecurringCandidate, detection: RecurringDetection): Promise<void>;
}

export interface RecurringJobProcessor {
  scheduleDue(): Promise<void>;
  processNext(): Promise<boolean>;
}

export interface RecurringActionRecorder {
  recordAction(input: {
    workspaceId: string; profileId: string; name: string; contextKey: string;
    properties?: Record<string, string | number | boolean>;
  }): Promise<void>;
}
