import { describe, expect, it } from 'vitest';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/modules/proactivity/domain/unsubscribe-token';

describe('unsubscribe tokens', () => {
  const secret = 'a-secure-test-secret-with-at-least-32-characters';
  const now = new Date('2026-09-12T12:00:00Z');

  it('round-trips scoped claims', () => {
    const token = createUnsubscribeToken({ workspaceId: 'workspace', profileId: 'profile', category: 'WEEKLY_DIGEST' }, secret, now);
    expect(verifyUnsubscribeToken(token, secret, now)).toMatchObject({
      workspaceId: 'workspace', profileId: 'profile', category: 'WEEKLY_DIGEST', v: 1,
    });
  });

  it('refuses unsafe signing secrets', () => {
    expect(() => createUnsubscribeToken({ workspaceId: 'w', profileId: 'p', category: 'WEEKLY_DIGEST' }, 'short')).toThrow();
    expect(verifyUnsubscribeToken('anything.signature', 'short')).toBeNull();
  });

  it('rejects tampering and expiration', () => {
    const token = createUnsubscribeToken({ workspaceId: 'workspace', profileId: 'profile', category: 'CRITICAL_ALERTS' }, secret, now);
    expect(verifyUnsubscribeToken(`${token}x`, secret, now)).toBeNull();
    expect(verifyUnsubscribeToken(token, secret, new Date('2027-04-01T12:00:00Z'))).toBeNull();
  });
});
