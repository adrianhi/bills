import { describe, expect, it } from 'vitest';
import { canIncludeBudget, createExportForm, exportFormError, reportPeriodParams, selectedReportPeriod } from './export-form';

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
  it('resolves multi-month presets for 3 and 6 months', () => {
    const state3m = { ...createExportForm({}, today), periodType: '3m' as const };
    const period3m = selectedReportPeriod(state3m, undefined, today);
    expect(period3m).toEqual({ kind: 'range', startDate: '2026-07-01', endDate: '2026-09-02' });
    expect(exportFormError(state3m, period3m, today)).toBeNull();

    const state6m = { ...createExportForm({}, today), periodType: '6m' as const };
    const period6m = selectedReportPeriod(state6m, undefined, today);
    expect(period6m).toEqual({ kind: 'range', startDate: '2026-04-01', endDate: '2026-09-02' });
    expect(exportFormError(state6m, period6m, today)).toBeNull();
  });
  it('handles multi-month presets across year boundaries', () => {
    const JanToday = '2027-01-15';
    const state3m = { ...createExportForm({}, JanToday), periodType: '3m' as const };
    expect(selectedReportPeriod(state3m, undefined, JanToday)).toEqual({
      kind: 'range',
      startDate: '2026-11-01',
      endDate: '2027-01-15',
    });
    const state6m = { ...createExportForm({}, JanToday), periodType: '6m' as const };
    expect(selectedReportPeriod(state6m, undefined, JanToday)).toEqual({
      kind: 'range',
      startDate: '2026-08-01',
      endDate: '2027-01-15',
    });
  });
});
