import { describe, expect, it } from 'vitest';
import { currentLocalDateTime, fromDateValue, isFutureLocalDateTime, normalizeRange, toDateValue } from './date-values';

describe('date values', () => {
  it('round-trips calendar dates without applying UTC offsets', () => {
    const date = fromDateValue('2026-08-30');
    expect(date).toBeDefined();
    expect(toDateValue(date!)).toBe('2026-08-30');
    expect(fromDateValue('2026-02-30')).toBeUndefined();
  });

  it('normalizes inverted ranges and keeps single-day ranges', () => {
    expect(normalizeRange({ from: '2026-08-30', to: '2026-08-01' })).toEqual({ from: '2026-08-01', to: '2026-08-30' });
    expect(normalizeRange({ from: '2026-08-30', to: '2026-08-30' })).toEqual({ from: '2026-08-30', to: '2026-08-30' });
  });

  it('formats and validates local date-times', () => {
    const now = new Date(2026, 7, 30, 14, 5);
    expect(currentLocalDateTime(now)).toBe('2026-08-30T14:05');
    expect(isFutureLocalDateTime('2026-08-30T14:06', now)).toBe(true);
    expect(isFutureLocalDateTime('2026-08-30T14:05', now)).toBe(false);
  });
});
