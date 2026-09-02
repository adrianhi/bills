import { describe, expect, it, vi } from 'vitest';
import { ConfirmRuleApplication } from '../src/modules/categorization/application/confirm-rule-application';
import { PreviewRuleApplication } from '../src/modules/categorization/application/preview-rule-application';
import { RetryRuleApplication } from '../src/modules/categorization/application/retry-rule-application';
import type { ApplicationSession, RuleApplications, RuleApplicationUnitOfWork } from '../src/modules/categorization/application/rule-application.port';

function dependencies() {
  const session: ApplicationSession = { rules: vi.fn().mockResolvedValue([]), active: vi.fn().mockResolvedValue(false),
    get: vi.fn().mockResolvedValue({ id: 'job', phase: 'PREVIEW', status: 'READY', fingerprint: '[]' }),
    create: vi.fn().mockResolvedValue('job'), queue: vi.fn() };
  const unit: RuleApplicationUnitOfWork = { run: (_workspace, work) => work(session) };
  const queries = { get: vi.fn().mockResolvedValue({ id: 'job' }) } as unknown as RuleApplications;
  return { session, unit, queries };
}
describe('rule application use cases', () => {
  it('confirms a current preview inside the workspace unit of work', async () => {
    const { session, unit, queries } = dependencies();
    await new ConfirmRuleApplication(unit, queries).execute('workspace', 'job');
    expect(session.queue).toHaveBeenCalledWith('job', 'APPLY');
    expect(queries.get).toHaveBeenCalledWith('workspace', 'job');
  });
  it('makes a repeated confirmation idempotent', async () => {
    const { session, unit, queries } = dependencies();
    vi.mocked(session.get).mockResolvedValue({ id: 'job', phase: 'APPLY', status: 'PROCESSING', fingerprint: '[]' });
    await new ConfirmRuleApplication(unit, queries).execute('workspace', 'job');
    expect(session.queue).not.toHaveBeenCalled();
  });
  it('rejects stale previews and concurrent operations', async () => {
    const { session, unit, queries } = dependencies();
    vi.mocked(session.get).mockResolvedValue({ id: 'job', phase: 'PREVIEW', status: 'READY', fingerprint: 'old' });
    await expect(new ConfirmRuleApplication(unit, queries).execute('workspace', 'job')).rejects.toMatchObject({ code: 'PREVIEW_STALE' });
    vi.mocked(session.active).mockResolvedValue(true);
    await expect(new PreviewRuleApplication(unit, queries).execute('workspace', 'rule', { includeUnknown: false })).rejects.toMatchObject({ code: 'RULE_APPLICATION_ACTIVE' });
    expect(session.create).not.toHaveBeenCalled();
  });
  it('only retries failed applications without resetting their stored proposals', async () => {
    const { session, unit, queries } = dependencies();
    const retry = new RetryRuleApplication(unit, queries);
    await expect(retry.execute('workspace', 'job')).rejects.toMatchObject({ code: 'APPLICATION_NOT_FAILED' });
    vi.mocked(session.get).mockResolvedValue({ id: 'job', phase: 'APPLY', status: 'FAILED', fingerprint: '[]' });
    await retry.execute('workspace', 'job');
    expect(session.queue).toHaveBeenCalledWith('job', 'APPLY');
    expect(session.create).not.toHaveBeenCalled();
  });
  it('does not expose applications outside the scoped workspace', async () => {
    const { session, unit, queries } = dependencies();
    vi.mocked(session.get).mockResolvedValue(null);
    await expect(new ConfirmRuleApplication(unit, queries).execute('other-workspace', 'job')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    expect(session.queue).not.toHaveBeenCalled();
  });
});
