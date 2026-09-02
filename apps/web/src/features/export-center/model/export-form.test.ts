import { describe, expect, it } from 'vitest';
import { canIncludeBudget, computePresetRange, createExportForm, exportFormError, reportPeriodParams, selectedReportPeriod } from './export-form';

const today = '2026-09-02';
describe('export form scope', () => {
  it('keeps the dashboard all-time selection without falling back to the current month', () => {
    const initialPeriod = { label: 'Todo el histórico' };
    const state = createExportForm({ initialPeriod }, today);
    expect(reportPeriodParams(selectedReportPeriod(state, initialPeriod, today))).toEqual({});
  });
  it('only defaults to the current month when no dashboard period was provided', () => {
    const state = createExportForm({}, today);
    expect(reportPeriodParams(selectedReportPeriod(state, undefined, today))).toEqual({ month: '2026-09' });
  });
  it('preserves calendar months and custom ranges', () => {
    const state = createExportForm({}, today);
    expect(reportPeriodParams(selectedReportPeriod(state, { label: 'Julio', month: '2026-07' }, today))).toEqual({ month: '2026-07' });
    const range = { startDate: '2026-01-01', endDate: '2026-01-01' };
    expect(reportPeriodParams(selectedReportPeriod(state, { ...range, label: 'Un día' }, today))).toEqual(range);
  });
  it('computes last3 and last6 quick presets smoothly', () => {
    expect(computePresetRange('last3', today)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-09-02',
    });
    expect(computePresetRange('last6', today)).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-09-02',
    });

    const state3 = { ...createExportForm({}, today), periodType: 'last3' as const };
    const period3 = selectedReportPeriod(state3, undefined, today);
    expect(reportPeriodParams(period3)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-09-02',
    });
    expect(exportFormError(state3, period3, today)).toBeNull();

    const state6 = { ...createExportForm({}, today), periodType: 'last6' as const };
    const period6 = selectedReportPeriod(state6, undefined, today);
    expect(reportPeriodParams(period6)).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-09-02',
    });
    expect(exportFormError(state6, period6, today)).toBeNull();
  });
  it('keeps an incompatible budget selected until the user removes it', () => {
    const period = { kind: 'month', month: '2026-08' } as const;
    const state = { ...createExportForm({}, today), sections: ['budget'] as const };
    const selected = { ...state, sections: [...state.sections, 'summary'] as Array<'budget' | 'summary'> };
    expect(canIncludeBudget(selected, period)).toBe(true);
    const filtered = { ...selected, institutionCodes: ['BHD'] };
    expect(exportFormError(filtered, period, today)).toContain('Desmarca Presupuesto');
    expect(filtered.sections).toContain('budget');
    expect(exportFormError({ ...filtered, sections: ['summary'] }, period, today)).toBeNull();
  });
  it.each([
    ['2026-02-30', '2026-03-01'], ['', '2026-01-01'], ['2026-08-10', '2026-08-01'],
    ['2026-09-01', '2026-09-03'],
  ])('validates range %s to %s', (startDate, endDate) => {
    expect(exportFormError(createExportForm({}, today), { kind: 'range', startDate, endDate }, today)).not.toBeNull();
  });
});
