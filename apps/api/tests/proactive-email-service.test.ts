import { describe, expect, it, vi } from 'vitest';
import { ProactiveEmailService } from '../src/modules/proactivity/application/proactive-email.service';
import type { EmailDeliveryRecord, EmailPreferenceRecord, ProactiveEmailRepository, ProactiveEmailTransport } from '../src/modules/proactivity/application/proactive.ports';
import type { WeeklyEmailBuilder } from '../src/modules/proactivity/application/weekly-email.builder';

const preference: EmailPreferenceRecord = {
  workspaceId: 'workspace', profileId: 'profile', email: 'adrian@example.com', displayName: 'Adrian',
  timezone: 'America/Santo_Domingo', defaultCurrency: 'DOP', weeklyDigestEnabled: false,
  criticalAlertsEnabled: false, digestSchedule: 'MONDAY_0730', nextWeeklyDigestAt: null,
};

function fixture() {
  let claimed = false;
  const job: EmailDeliveryRecord = {
    id: 'delivery', workspaceId: 'workspace', profileId: 'profile', kind: 'TEST', recipient: preference.email,
    subject: 'Test', html: '<p>Test</p>', text: 'Test', headers: {}, attempts: 1, maxAttempts: 5,
    createdAt: new Date('2026-09-12T12:00:00Z'), leaseToken: 'lease',
  };
  const repository = {
    getPreferences: vi.fn(async () => preference), updatePreferences: vi.fn(async (input) => ({ ...preference, ...input })),
    disableCategory: vi.fn(async () => true), dueWeekly: vi.fn(async () => []), alertAudiences: vi.fn(async () => []),
    advanceWeekly: vi.fn(async () => {}), markAlertsEvaluated: vi.fn(async () => {}),
    enqueue: vi.fn(async () => ({ id: job.id, created: true })),
    claim: vi.fn(async () => { if (claimed) return null; claimed = true; return job; }),
    accepted: vi.fn(async () => {}), failed: vi.fn(async () => {}), testCount: vi.fn(async () => 0),
    recordProviderEvent: vi.fn(async () => true), prunePayloads: vi.fn(async () => 0),
  } as unknown as ProactiveEmailRepository;
  const transport = { sendEmail: vi.fn(async () => ({ accepted: true, providerMessageId: 'email_1', mode: 'SMTP' as const })) };
  const builder = { build: vi.fn(async () => ({ subject: 'Digest', html: '<p>Digest</p>', text: 'Digest' })) };
  const service = new ProactiveEmailService(repository, transport as ProactiveEmailTransport, builder as unknown as WeeklyEmailBuilder, {
    appUrl: 'https://cuadre.example', apiPublicUrl: 'https://api.cuadre.example',
    unsubscribeSecret: 'secure-test-secret-with-at-least-32-characters',
  });
  return { service, repository, transport, builder };
}

describe('ProactiveEmailService', () => {
  it('keeps email disabled until an explicit full preference update', async () => {
    const { service, repository } = fixture();
    expect(await service.getPreferences('workspace', 'profile')).toMatchObject({
      weeklyDigestEnabled: false, criticalAlertsEnabled: false, recipientMasked: 'ad****@example.com',
    });
    const updated = await service.updatePreferences('workspace', 'profile', {
      weeklyDigestEnabled: true, criticalAlertsEnabled: false, digestSchedule: 'SUNDAY_1800',
    });
    expect(updated.weeklyDigestEnabled).toBe(true);
    expect(vi.mocked(repository.updatePreferences).mock.calls[0][0].nextWeeklyDigestAt).toBeInstanceOf(Date);
  });

  it('allows only one of five concurrent processors to send the claimed delivery', async () => {
    const { service, repository, transport } = fixture();
    const results = await Promise.all(Array.from({ length: 5 }, () => service.processNext()));
    expect(results.filter((result) => result.accepted)).toHaveLength(1);
    expect(transport.sendEmail).toHaveBeenCalledTimes(1);
    expect(transport.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'cuadre/delivery' }));
    expect(repository.accepted).toHaveBeenCalledTimes(1);
  });

  it('rejects a fourth test email inside an hour', async () => {
    const { service, repository } = fixture();
    vi.mocked(repository.testCount).mockResolvedValue(3);
    await expect(service.sendTest('workspace', 'profile', 'DOP')).rejects.toMatchObject({ code: 'EMAIL_TEST_RATE_LIMIT' });
  });
});
