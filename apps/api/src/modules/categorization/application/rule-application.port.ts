import type { PreviewRuleApplicationInput, RuleApplicationDto } from '@bills/contracts';
import type { RuleRecord } from '../domain/rule-matcher';
import type { PreviewDecision } from '../domain/preview-decision';

export interface ApplicationJob {
  id: string; workspaceId: string; ruleId: string; phase: string; status: string; includeUnknown: boolean;
  cutoff: Date; startDate: Date | null; endDate: Date | null; cursor: string | null;
  rulesSnapshot: RuleRecord[]; leaseToken: string | null;
}
export interface RuleApplications {
  get(workspaceId: string, id: string): Promise<RuleApplicationDto>;
  recent(workspaceId: string): Promise<RuleApplicationDto[]>;
  claim(): Promise<ApplicationJob | null>;
  checkpoint(job: ApplicationJob, rows: PreviewDecision[], scanned: number, cursor: string | null, complete: boolean): Promise<void>;
  applyBatch(job: ApplicationJob): Promise<void>;
  fail(job: ApplicationJob): Promise<void>;
}
export interface RuleApplicationActions {
  preview(workspaceId: string, ruleId: string, input: PreviewRuleApplicationInput): Promise<RuleApplicationDto>;
  confirm(workspaceId: string, id: string): Promise<RuleApplicationDto>;
  retry(workspaceId: string, id: string): Promise<RuleApplicationDto>;
  get(workspaceId: string, id: string): Promise<RuleApplicationDto>;
  recent(workspaceId: string): Promise<RuleApplicationDto[]>;
}
export interface ApplicationSession {
  rules(): Promise<RuleRecord[]>;
  active(): Promise<boolean>;
  get(id: string): Promise<{ id: string; phase: string; status: string; fingerprint: string } | null>;
  create(ruleId: string, input: PreviewRuleApplicationInput, rules: RuleRecord[], fingerprint: string): Promise<string>;
  queue(id: string, phase: string): Promise<void>;
}
export interface RuleApplicationUnitOfWork {
  run<T>(workspaceId: string, work: (session: ApplicationSession) => Promise<T>): Promise<T>;
}
