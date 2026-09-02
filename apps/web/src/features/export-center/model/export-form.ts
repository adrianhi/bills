import type { PeriodSelection } from '@/entities/period';
import type { FinancialReportSection } from '../api/report.service';
import { currentReportDate, type ExportFormat, type ExportPeriodType } from './export-options';

export interface ExportFilters {
  category?: string; status?: string; organization?: string; transactionType?: string; search?: string;
}
export interface ExportFormInitial {
  initialPeriod?: PeriodSelection;
  initialCurrency?: string;
  initialFilters?: ExportFilters;
}
export type ExportPeriodType = 'current' | 'last3' | 'last6' | 'all' | 'custom';

export interface ExportFormState {
  format: ExportFormat; currency: string; periodType: ExportPeriodType;
  customStartDate: string; customEndDate: string; institutionCodes: string[];
  category: string; status: string; transactionType: string; search: string;
  title: string; sections: FinancialReportSection[]; includeNotes: boolean;
}
export type ReportPeriod =
  | { kind: 'all' }
  | { kind: 'month'; month: string }
  | { kind: 'range'; startDate: string; endDate: string };

export function calculatePresetRange(monthsBack: number, today = currentReportDate()): { startDate: string; endDate: string } {
  const [year, month] = today.split('-').map(Number);
  const startDateObj = new Date(Date.UTC(year, (month - 1) - (monthsBack - 1), 1));
  const startYear = startDateObj.getUTCFullYear();
  const startMonth = String(startDateObj.getUTCMonth() + 1).padStart(2, '0');
  const startDate = `${startYear}-${startMonth}-01`;
  return { startDate, endDate: today };
}

export function computePresetRange(preset: 'last3' | 'last6', today = currentReportDate()): { startDate: string; endDate: string } {
  const monthsBack = preset === 'last3' ? 3 : 6;
  return calculatePresetRange(monthsBack, today);
}

export function createExportForm(initial: ExportFormInitial, today = currentReportDate()): ExportFormState {
  const filters = initial.initialFilters || {};
  return {
    format: 'xlsx', currency: initial.initialCurrency || 'DOP', periodType: 'current',
    customStartDate: initial.initialPeriod?.startDate || `${today.slice(0, 7)}-01`,
    customEndDate: initial.initialPeriod?.endDate || today,
    institutionCodes: filters.organization ? [filters.organization] : [],
    category: filters.category || '', status: filters.status || '', transactionType: filters.transactionType || '',
    search: filters.search || '', title: '', includeNotes: false,
    sections: ['summary', 'comparison', 'categories', 'merchants', 'movements'],
  };
}

export function selectedReportPeriod(state: ExportFormState, initial?: PeriodSelection, today = currentReportDate()): ReportPeriod {
  if (state.periodType === 'all') return { kind: 'all' };
  if (state.periodType === 'last3' || state.periodType === 'last6') {
    const range = computePresetRange(state.periodType, today);
    return { kind: 'range', startDate: range.startDate, endDate: range.endDate };
  }
  if (state.periodType === 'custom') return { kind: 'range', startDate: state.customStartDate, endDate: state.customEndDate };
  if (state.periodType === '3m' || state.periodType === 'last_3_months') {
    return { kind: 'range', ...calculatePresetRange(3, today) };
  }
  if (state.periodType === '6m' || state.periodType === 'last_6_months') {
    return { kind: 'range', ...calculatePresetRange(6, today) };
  }
  if (!initial) return { kind: 'month', month: today.slice(0, 7) };
  if (initial.startDate !== undefined || initial.endDate !== undefined) {
    return { kind: 'range', startDate: initial.startDate || '', endDate: initial.endDate || '' };
  }
  if (initial.month) return { kind: 'month', month: initial.month };
  return { kind: 'all' };
}

export function reportPeriodParams(period: ReportPeriod) {
  if (period.kind === 'month') return { month: period.month };
  if (period.kind === 'range') return { startDate: period.startDate, endDate: period.endDate };
  return {};
}

export function canIncludeBudget(state: ExportFormState, period: ReportPeriod): boolean {
  return (state.format === 'pdf' || state.format === 'xlsx') && period.kind === 'month'
    && ['DOP', 'USD'].includes(state.currency) && state.institutionCodes.length === 0
    && !state.category && !state.status && !state.transactionType && !state.search;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function exportFormError(state: ExportFormState, period: ReportPeriod, today = currentReportDate()): string | null {
  if (state.format === 'json') return null;
  if (!['DOP', 'USD'].includes(state.currency)) return 'Selecciona DOP o USD.';
  if (period.kind === 'month' && (!validDate(`${period.month}-01`) || period.month > today.slice(0, 7))) {
    return 'Selecciona un mes válido que no sea futuro.';
  }
  if (period.kind === 'range') {
    if (!validDate(period.startDate) || !validDate(period.endDate)) return 'Selecciona las dos fechas del período.';
    if (period.startDate > period.endDate) return 'La fecha final no puede ser anterior a la inicial.';
    if (period.endDate > today) return 'Las fechas del reporte no pueden ser futuras.';
  }
  if (state.format === 'pdf' || state.format === 'xlsx') {
    if (!state.sections.length) return 'Selecciona al menos una sección.';
    if (state.sections.includes('budget') && !canIncludeBudget(state, period)) {
      return 'Desmarca Presupuesto o selecciona un mes calendario sin filtros adicionales.';
    }
  }
  return null;
}
