import { REPORT_SECTIONS, type FinancialReportQueryInput } from '../../../schemas/transaction.schema';
import type { AnalyticsService } from '../../analytics';
import type { TransactionApplicationService } from '../../transactions';
import { institutionDisplayName, resolveInstitutionCode } from '../../transactions/domain';
import { reportPeriodLabel, type ReportScope } from '../domain/report-scope';
import type { BudgetSummaryDto } from '@bills/contracts';

const formulaPrefix = /^[\s]*[=+\-@]/;

export const safeSpreadsheetText = (value: unknown) => {
  const text = String(value ?? '');
  return formulaPrefix.test(text) ? `'${text}` : text;
};

export const formatReportDate = (value: Date) => new Intl.DateTimeFormat('es-DO', {
  timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value);

export const currencyValue = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type ReportSummary = Awaited<ReturnType<AnalyticsService['getSummary']>>;
export type ReportTransaction = Awaited<ReturnType<TransactionApplicationService['export']>>[number];
export type ReportBudget = BudgetSummaryDto | null;

export const budgetStatusLabel = (status: BudgetSummaryDto['categories'][number]['status']) => ({
  ON_TRACK: 'En ritmo', PACE_WARNING: 'Ritmo acelerado', NEAR_LIMIT: 'Cerca del límite', EXCEEDED: 'Excedido',
}[status]);

export function financialRows(transactions: ReportTransaction[], includeNotes: boolean) {
  return transactions.map((transaction) => ({
    Fecha: formatReportDate(transaction.transactionDate),
    Comercio: safeSpreadsheetText(transaction.merchant),
    Categoría: safeSpreadsheetText(transaction.category),
    Tipo: safeSpreadsheetText(transaction.transactionType),
    Banco: institutionDisplayName(transaction.institutionCode),
    Cuenta: transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : '',
    Monto: Number(transaction.amount),
    Moneda: transaction.currency,
    Estado: safeSpreadsheetText(transaction.status),
    ...(includeNotes ? { Notas: safeSpreadsheetText(transaction.notes) } : {}),
  }));
}

export type FinancialRow = ReturnType<typeof financialRows>[number];

export interface ReportPresentation {
  title: string;
  sections: FinancialReportQueryInput['sections'];
  metadata: Array<{ label: string; value: string }>;
}

export function reportPresentation(query: FinancialReportQueryInput, scope: ReportScope): ReportPresentation {
  const codes = query.institutionCodes?.length
    ? query.institutionCodes
    : query.institutionCode || query.organization
      ? [resolveInstitutionCode(query.institutionCode || query.organization, query.organization)]
      : [];
  const filters = [
    query.category && `Categoría: ${query.category}`,
    query.status && `Estado: ${query.status}`,
    query.transactionType && `Tipo: ${query.transactionType}`,
    query.search && `Búsqueda: ${query.search}`,
  ].filter((value): value is string => Boolean(value));
  return {
    title: query.title || 'Informe financiero',
    sections: query.sections || REPORT_SECTIONS.filter((section) => section !== 'budget'),
    metadata: [
      { label: 'Período', value: reportPeriodLabel(scope) },
      { label: 'Moneda', value: scope.currency },
      { label: 'Bancos', value: codes.length ? codes.map(institutionDisplayName).join(', ') : 'Todos los bancos' },
      { label: 'Filtros', value: filters.join(' | ') || 'Sin filtros adicionales' },
      { label: 'Comparado con', value: reportPeriodLabel(scope, true) },
      { label: 'Generado', value: formatReportDate(scope.generatedAt) },
    ],
  };
}

const MONTH_ABBRS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  return `${MONTH_ABBRS[month - 1]} ${year}`;
}

export interface MonthlyCategoryRow {
  category: string;
  monthlyAmounts: Record<string, number>;
  total: number;
  average: number;
  momChangePercent: number | null;
}

export interface MonthlyCategoryMatrix {
  months: string[];
  monthLabels: string[];
  categories: MonthlyCategoryRow[];
  monthTotals: Record<string, number>;
  grandTotal: number;
  overallAverage: number;
  overallMomChangePercent: number | null;
}

function extractMonthKeyFromDate(dateStr: unknown): string | null {
  if (typeof dateStr !== 'string') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [, month, year] = parts;
  if (!year || !month) return null;
  return `${year}-${month.padStart(2, '0')}`;
}

export function buildMonthlyCategoryMatrix(
  rows: FinancialRow[],
  summary: ReportSummary,
): MonthlyCategoryMatrix {
  const approvedRows = rows.filter((r) => r.Estado === 'Aprobada');
  const effectiveRows = approvedRows.length ? approvedRows : rows.filter((r) => r.Estado !== 'Rechazada');
  const finalRows = effectiveRows.length ? effectiveRows : rows;

  const rowMonths = [
    ...new Set(finalRows.map((r) => extractMonthKeyFromDate(r.Fecha)).filter((m): m is string => Boolean(m))),
  ].sort();

  let months: string[] = [];
  const amountsByCategory: Record<string, Record<string, number>> = {};

  const comparison = 'comparison' in summary ? summary.comparison : undefined;
  const prevMonthKey = comparison?.previousPeriod?.startDate?.slice(0, 7);
  const currMonthKey = comparison?.currentPeriod?.startDate?.slice(0, 7);

  if (rowMonths.length >= 2) {
    months = rowMonths;
    finalRows.forEach((row) => {
      const monthKey = extractMonthKeyFromDate(row.Fecha);
      if (!monthKey) return;
      const cat = row.Categoría || 'Sin categoría';
      if (!amountsByCategory[cat]) amountsByCategory[cat] = {};
      amountsByCategory[cat][monthKey] = (amountsByCategory[cat][monthKey] || 0) + Number(row.Monto || 0);
    });
  } else if (prevMonthKey && currMonthKey && prevMonthKey !== currMonthKey && comparison?.categoryDeltas?.length) {
    months = [prevMonthKey, currMonthKey].sort();
    comparison.categoryDeltas.forEach((delta) => {
      const cat = delta.name || 'Sin categoría';
      if (!amountsByCategory[cat]) amountsByCategory[cat] = {};
      amountsByCategory[cat][prevMonthKey] = Number(delta.previousTotal || 0);
      amountsByCategory[cat][currMonthKey] = Number(delta.currentTotal || 0);
    });
    summary.byCategory.forEach((catItem) => {
      const cat = catItem.category || 'Sin categoría';
      if (!amountsByCategory[cat]) amountsByCategory[cat] = {};
      if (amountsByCategory[cat][currMonthKey] === undefined) {
        amountsByCategory[cat][currMonthKey] = Number(catItem.total || 0);
      }
      if (amountsByCategory[cat][prevMonthKey] === undefined) {
        amountsByCategory[cat][prevMonthKey] = 0;
      }
    });
  } else {
    const singleMonth = rowMonths[0] || currMonthKey || summary.period || new Date().toISOString().slice(0, 7);
    months = [singleMonth];
    summary.byCategory.forEach((catItem) => {
      const cat = catItem.category || 'Sin categoría';
      if (!amountsByCategory[cat]) amountsByCategory[cat] = {};
      amountsByCategory[cat][singleMonth] = Number(catItem.total || 0);
    });
    if (!summary.byCategory.length) {
      finalRows.forEach((row) => {
        const cat = row.Categoría || 'Sin categoría';
        if (!amountsByCategory[cat]) amountsByCategory[cat] = {};
        amountsByCategory[cat][singleMonth] = (amountsByCategory[cat][singleMonth] || 0) + Number(row.Monto || 0);
      });
    }
  }

  const monthLabels = months.map(formatMonthLabel);
  const categories: MonthlyCategoryRow[] = Object.entries(amountsByCategory).map(([cat, monthlyMap]) => {
    let total = 0;
    months.forEach((m) => { total += (monthlyMap[m] || 0); });
    const average = months.length ? total / months.length : 0;
    let momChangePercent: number | null = null;
    if (months.length >= 2) {
      const prev = monthlyMap[months[months.length - 2]] || 0;
      const curr = monthlyMap[months[months.length - 1]] || 0;
      if (prev > 0) {
        momChangePercent = (curr - prev) / prev;
      } else if (curr > 0) {
        momChangePercent = 1.0;
      } else {
        momChangePercent = 0;
      }
    }
    return {
      category: cat,
      monthlyAmounts: monthlyMap,
      total,
      average,
      momChangePercent,
    };
  });

  categories.sort((a, b) => b.total - a.total);

  const monthTotals: Record<string, number> = {};
  months.forEach((m) => {
    monthTotals[m] = categories.reduce((sum, c) => sum + (c.monthlyAmounts[m] || 0), 0);
  });
  const grandTotal = Object.values(monthTotals).reduce((sum, v) => sum + v, 0);
  const overallAverage = months.length ? grandTotal / months.length : 0;

  let overallMomChangePercent: number | null = null;
  if (months.length >= 2) {
    const prevTotal = monthTotals[months[months.length - 2]] || 0;
    const currTotal = monthTotals[months[months.length - 1]] || 0;
    if (prevTotal > 0) {
      overallMomChangePercent = (currTotal - prevTotal) / prevTotal;
    } else if (currTotal > 0) {
      overallMomChangePercent = 1.0;
    } else {
      overallMomChangePercent = 0;
    }
  }

  return {
    months,
    monthLabels,
    categories,
    monthTotals,
    grandTotal,
    overallAverage,
    overallMomChangePercent,
  };
}
