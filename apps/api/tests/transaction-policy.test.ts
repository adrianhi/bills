import { describe, expect, it } from 'vitest';
import { resolveDateRange } from '../src/modules/transactions/domain/transaction-policy';

describe('transaction date ranges', () => {
  it('uses Santo Domingo calendar boundaries for a selected day', () => {
    const range = resolveDateRange(undefined, '2026-08-28', '2026-08-28');
    expect(range.gte?.toISOString()).toBe('2026-08-28T04:00:00.000Z');
    expect(range.lte?.toISOString()).toBe('2026-08-29T03:59:59.999Z');
  });

  it('uses Santo Domingo boundaries across a month rollover', () => {
    const range = resolveDateRange('2026-12');
    expect(range.gte?.toISOString()).toBe('2026-12-01T04:00:00.000Z');
    expect(range.lte?.toISOString()).toBe('2027-01-01T03:59:59.999Z');
  });
});
