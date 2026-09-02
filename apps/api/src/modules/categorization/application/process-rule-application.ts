import type { ClassificationCandidates } from '../../transactions';
import { previewDecision } from '../domain/preview-decision';
import type { RuleApplications } from './rule-application.port';

export class ProcessRuleApplication {
  constructor(private readonly jobs: RuleApplications, private readonly candidates: ClassificationCandidates) {}
  async processNext() {
    const job = await this.jobs.claim();
    if (!job) return false;
    try {
      if (job.phase === 'APPLY') await this.jobs.applyBatch(job);
      else {
        const rule = job.rulesSnapshot.find((item) => item.id === job.ruleId);
        if (!rule) throw new Error('RULE_SNAPSHOT_MISSING');
        const rows = await this.candidates.page(job);
        const decisions = rows.flatMap((row) => {
          const decision = previewDecision(row, rule, job.rulesSnapshot, job.includeUnknown);
          return decision ? [decision] : [];
        });
        await this.jobs.checkpoint(job, decisions, rows.length, rows.at(-1)?.id || job.cursor, rows.length < 250);
      }
    } catch {
      await this.jobs.fail(job);
    }
    return true;
  }
}
