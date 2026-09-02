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
