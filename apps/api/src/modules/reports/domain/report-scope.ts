import { resolveComparisonPeriods, type ComparisonPeriods } from '../../analytics/domain';

export interface ReportScopeInput {
  month?: string; startDate?: string; endDate?: string; currency?: string;
}

type ReportPeriod =
  | { kind: 'all' }
  | { kind: 'month'; month: string }
  | { kind: 'range'; startDate: string; endDate: string };

export type ReportScope = ReportPeriod & {
  currency: 'DOP' | 'USD';
  comparison: ComparisonPeriods | null;
  generatedAt: Date;
};

interface ScopeIssue { path: keyof ReportScopeInput; message: string }

const dateValue = (now: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function reportScopeIssues(input: ReportScopeInput, now = new Date()): ScopeIssue[] {
  const issues: ScopeIssue[] = [];
  const today = dateValue(now);
  if (input.currency !== undefined && !['DOP', 'USD'].includes(input.currency.toUpperCase())) {
    issues.push({ path: 'currency', message: 'Los reportes admiten DOP o USD.' });
  }
  if (input.month !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(input.month) || !isCalendarDate(`${input.month}-01`)) {
      issues.push({ path: 'month', message: 'Selecciona un mes calendario válido.' });
    } else if (input.month > today.slice(0, 7)) {
      issues.push({ path: 'month', message: 'El mes no puede ser futuro.' });
    }
    if (input.startDate !== undefined || input.endDate !== undefined) {
      issues.push({ path: 'month', message: 'Elige un mes o un rango de fechas, no ambos.' });
    }
  }
  const hasStart = input.startDate !== undefined;
  const hasEnd = input.endDate !== undefined;
  if (hasStart !== hasEnd) {
    issues.push({ path: hasStart ? 'endDate' : 'startDate', message: 'Indica el inicio y el fin del período.' });
  }
  for (const path of ['startDate', 'endDate'] as const) {
    const value = input[path];
    if (value === undefined) continue;
    if (!isCalendarDate(value)) issues.push({ path, message: 'La fecha debe ser válida y usar YYYY-MM-DD.' });
    else if (value > today) issues.push({ path, message: 'Las fechas del reporte no pueden ser futuras.' });
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    issues.push({ path: 'endDate', message: 'La fecha final no puede ser anterior a la inicial.' });
  }
  return issues;
}

export function resolveReportScope(input: ReportScopeInput, now = new Date()): ReportScope {
  const issues = reportScopeIssues(input, now);
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
  const period: ReportPeriod = input.month ? { kind: 'month', month: input.month }
    : input.startDate && input.endDate
      ? { kind: 'range', startDate: input.startDate, endDate: input.endDate }
      : { kind: 'all' };
  return {
    ...period, currency: (input.currency?.toUpperCase() || 'DOP') as ReportScope['currency'],
    comparison: resolveComparisonPeriods(input, now), generatedAt: now,
  };
}

export function reportPeriodLabel(scope: ReportScope, previous = false): string {
  const period = previous ? scope.comparison?.previous : scope.comparison?.current;
  if (!period) return previous ? 'Sin período comparable' : 'Todo el histórico';
  return `${period.startDate} al ${period.endDate}`;
}
