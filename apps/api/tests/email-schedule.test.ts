import { describe, expect, it } from 'vitest';
import { digestCycleKey, nextDigestAt, rollingDigestWindow, validTimeZone } from '../src/modules/proactivity/domain/email-schedule';

describe('proactive email schedule', () => {
  it('resolves both Santo Domingo presets and one shared weekly cycle', () => {
    const sunday = nextDigestAt(new Date('2026-09-12T12:00:00Z'), 'America/Santo_Domingo', 'SUNDAY_1800');
    const monday = nextDigestAt(new Date('2026-09-13T23:00:00Z'), 'America/Santo_Domingo', 'MONDAY_0730');
    expect(sunday.toISOString()).toBe('2026-09-13T22:00:00.000Z');
    expect(monday.toISOString()).toBe('2026-09-14T11:30:00.000Z');
    expect(digestCycleKey(sunday, 'SUNDAY_1800', 'America/Santo_Domingo')).toBe('2026-W37');
    expect(digestCycleKey(monday, 'MONDAY_0730', 'America/Santo_Domingo')).toBe('2026-W37');
  });

  it('keeps local wall-clock boundaries across daylight saving changes', () => {
    const scheduled = nextDigestAt(new Date('2026-10-30T12:00:00Z'), 'America/New_York', 'SUNDAY_1800');
    const window = rollingDigestWindow(scheduled, 'America/New_York');
    expect(scheduled.toISOString()).toBe('2026-11-01T23:00:00.000Z');
    expect(window.currentStart.toISOString()).toBe('2026-10-25T22:00:00.000Z');
    expect(scheduled.getTime() - window.currentStart.getTime()).toBe(169 * 3_600_000);
  });

  it('validates IANA timezones', () => {
    expect(validTimeZone('America/Santo_Domingo')).toBe(true);
    expect(validTimeZone('Not/A_Zone')).toBe(false);
  });
});
