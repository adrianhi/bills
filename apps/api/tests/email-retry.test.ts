import { describe, expect, it } from 'vitest';
import { decideEmailFailure } from '../src/modules/proactivity/domain/email-retry';

describe('email retry policy', () => {
  const now = new Date('2026-09-13T12:00:00Z');

  it('retries transient failures with bounded backoff', () => {
    expect(decideEmailFailure({ createdAt: new Date('2026-09-13T11:00:00Z'), attempts: 1, maxAttempts: 5,
      retryable: true, ambiguous: false, now })).toEqual({ status: 'FAILED', retryAt: new Date('2026-09-13T12:01:00Z'), terminal: false });
  });

  it('does not retry configuration errors or exhausted deliveries', () => {
    expect(decideEmailFailure({ createdAt: now, attempts: 1, maxAttempts: 5, retryable: false, ambiguous: false, now }).terminal).toBe(true);
    expect(decideEmailFailure({ createdAt: now, attempts: 5, maxAttempts: 5, retryable: true, ambiguous: false, now }).terminal).toBe(true);
  });

  it('marks ambiguous requests older than the Resend idempotency window as unknown', () => {
    expect(decideEmailFailure({ createdAt: new Date('2026-09-12T11:59:59Z'), attempts: 2, maxAttempts: 5,
      retryable: true, ambiguous: true, now })).toEqual({ status: 'UNKNOWN', retryAt: null, terminal: true });
  });

  it('marks an ambiguous request unknown when its attempt budget is exhausted', () => {
    expect(decideEmailFailure({ createdAt: new Date('2026-09-13T11:00:00Z'), attempts: 5, maxAttempts: 5,
      retryable: true, ambiguous: true, now })).toEqual({ status: 'UNKNOWN', retryAt: null, terminal: true });
  });
});
