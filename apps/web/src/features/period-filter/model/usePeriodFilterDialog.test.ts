import { describe, expect, it } from 'vitest';
import { currentMonth, daysAgo, rangeForSelection, selectionForPreset } from './usePeriodFilterDialog';

const august30 = new Date(2026, 7, 30, 12);

describe('period selections', () => {
  it('builds rolling presets around the supplied local date', () => {
    expect(daysAgo(6, august30)).toBe('2026-08-24');
    expect(selectionForPreset('7d', august30)).toMatchObject({ startDate: '2026-08-24', endDate: '2026-08-30' });
    expect(selectionForPreset('30d', august30)).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-30' });
  });

  it('handles month and year boundaries without date overflow', () => {
    const january31 = new Date(2026, 0, 31, 12);
    expect(currentMonth(-1, january31)).toBe('2025-12');
    expect(selectionForPreset('last_month', january31).month).toBe('2025-12');
  });

  it('maps month filters to a visual range capped at today', () => {
    expect(rangeForSelection({ month: '2026-08', label: 'Agosto' }, august30)).toEqual({ from: '2026-08-01', to: '2026-08-30' });
    expect(rangeForSelection({ month: '2026-07', label: 'Julio' }, august30)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
    expect(rangeForSelection({ label: 'Todo' }, august30)).toEqual({ from: '', to: '' });
  });
});
