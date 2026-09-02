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

export type BudgetStatusTone = 'danger' | 'warning' | 'success';

export const budgetStatusLabel = (status: BudgetSummaryDto['categories'][number]['status']) => ({
  ON_TRACK: 'En ritmo', PACE_WARNING: 'Ritmo acelerado', NEAR_LIMIT: 'Cerca del límite', EXCEEDED: 'Excedido',
}[status]);

export function budgetStatusTone(status: BudgetSummaryDto['categories'][number]['status']): BudgetStatusTone {
  switch (status) {
    case 'EXCEEDED':
      return 'danger';
    case 'NEAR_LIMIT':
    case 'PACE_WARNING':
      return 'warning';
    case 'ON_TRACK':
    default:
      return 'success';
  }
}

export interface BudgetHealthSummary {
  isExceeded: boolean;
  excessAmount: number;
  availableAmount: number;
  limit: number;
  spent: number;
  pending: number;
  percentUsed: number;
  statusLabel: string;
  statusTone: BudgetStatusTone;
  formattedLimit: string;
  formattedSpent: string;
  formattedAvailable: string;
  formattedExcess: string;
}

export function budgetHealthSummary(budget: ReportBudget, currency: string): BudgetHealthSummary | null {
  if (!budget?.hasBudget || !budget.global) {
    return null;
  }
  const global = budget.global;
  const limit = Number(global.limit) || 0;
  const spent = Number(global.spent) || 0;
  const pending = Number(global.pending) || 0;
  const isExceeded = spent > limit || global.status === 'EXCEEDED';
  const excessAmount = isExceeded ? Math.max(0, Math.round((spent - limit) * 100) / 100) : 0;
  const availableAmount = isExceeded ? 0 : Math.max(0, Math.round((limit - spent) * 100) / 100);
  const percentUsed = typeof global.percentUsed === 'number'
    ? global.percentUsed
    : (limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0);
  const statusLabel = budgetStatusLabel(global.status) ?? (isExceeded ? 'Excedido' : 'En ritmo');
  const statusTone: BudgetStatusTone = isExceeded
    ? 'danger'
    : (global.status === 'NEAR_LIMIT' || global.status === 'PACE_WARNING' ? 'warning' : 'success');

  return {
    isExceeded,
    excessAmount,
    availableAmount,
    limit,
    spent,
    pending,
    percentUsed,
    statusLabel,
    statusTone,
    formattedLimit: currencyValue(limit, currency),
    formattedSpent: currencyValue(spent, currency),
    formattedAvailable: currencyValue(availableAmount, currency),
    formattedExcess: currencyValue(excessAmount, currency),
  };
}

export interface CategoryBudgetRow {
  categoryKey: string;
  categoryLabel: string;
  limit: number;
  spent: number;
  availableOrExcess: number;
  isExceeded: boolean;
  percentUsed: number;
  statusLabel: string;
  statusTone: BudgetStatusTone;
  formattedLimit: string;
  formattedSpent: string;
  formattedAvailableOrExcess: string;
}

export function categoryBudgetRows(budget: ReportBudget, currency: string): CategoryBudgetRow[] {
  if (!budget?.categories || !budget.categories.length) {
    return [];
  }
  return budget.categories.map((cat) => {
    const limit = Number(cat.limit) || 0;
    const spent = Number(cat.spent) || 0;
    const isExceeded = spent > limit || cat.status === 'EXCEEDED';
    const availableOrExcess = Math.round((limit - spent) * 100) / 100;
    const percentUsed = typeof cat.percentUsed === 'number'
      ? cat.percentUsed
      : (limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0);
    const statusLabel = budgetStatusLabel(cat.status) ?? (isExceeded ? 'Excedido' : 'En ritmo');
    const statusTone: BudgetStatusTone = isExceeded
      ? 'danger'
      : (cat.status === 'NEAR_LIMIT' || cat.status === 'PACE_WARNING' ? 'warning' : 'success');

    return {
      categoryKey: cat.categoryKey ?? '',
      categoryLabel: cat.categoryLabel || cat.categoryKey || 'Categoría',
      limit,
      spent,
      availableOrExcess,
      isExceeded,
      percentUsed,
      statusLabel,
      statusTone,
      formattedLimit: currencyValue(limit, currency),
      formattedSpent: currencyValue(spent, currency),
      formattedAvailableOrExcess: currencyValue(Math.abs(availableOrExcess), currency),
    };
  });
}

export function resolveCurrencySymbol(currency = 'DOP'): string {
  const code = (currency || '').trim().toUpperCase();
  if (code === 'DOP' || code === 'RD$') return 'RD$';
  if (code === 'USD' || code === '$') return '$';
  if (code === 'EUR' || code === '€') return '€';
  return currency.trim();
}

export function formatDelta(amount: number, currency: string, percent?: number | null): string {
  const normalized = amount === 0 ? 0 : amount;
  const symbol = resolveCurrencySymbol(currency);
  const formattedNumber = Math.abs(normalized).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = normalized > 0 ? '+' : normalized < 0 ? '-' : '';
  const base = sign ? `${sign}${symbol} ${formattedNumber}` : `${symbol} ${formattedNumber}`;

  if (percent === undefined || percent === null || Number.isNaN(percent)) {
    return base;
  }

  const percentSign = percent > 0 ? '+' : '';
  const formattedPercent = `${percentSign}${percent.toFixed(1)}%`;
  return `${base} (${formattedPercent})`;
}

export type RankedItem<T> = T & {
  rank: string;
  rankIndex: number;
  share: number;
  sharePercent: number;
};

export function sortAndRankItems<T extends { total: number }>(items: readonly T[], max = 6): RankedItem<T>[] {
  const sorted = [...items].sort((a, b) => b.total - a.total).slice(0, max);
  const grandTotal = items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  return sorted.map((item, index) => {
    const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 1000) / 10 : 0;
    return {
      ...item,
      rank: `#${index + 1}`,
      rankIndex: index + 1,
      share,
      sharePercent: share,
    };
  });
}

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
