import { stringify } from 'csv-stringify/sync';
import { AppError } from '../../../errors/app-error';
import type { FinancialReportQueryInput } from '../../../schemas/transaction.schema';
import type { AnalyticsService } from '../../analytics';
import type { TransactionApplicationService } from '../../transactions';
import { resolveReportScope } from '../domain/report-scope';
import { financialRows, reportPresentation } from './financial-report-data';
import { renderPdf } from './pdf-report.renderer';
import { renderXlsx } from './xlsx-report.renderer';
import type { GetMonthlyBudget } from '../../budgets';

export { safeSpreadsheetText } from './financial-report-data';

const PDF_REPORT_LIMIT = 500;
const XLSX_REPORT_LIMIT = 5_000;
const CSV_REPORT_LIMIT = 25_000;

export interface GeneratedFinancialReport {
  buffer: Buffer;
  contentType: string;
  extension: 'csv' | 'xlsx' | 'pdf';
  rowCount: number;
}

function reportLimit(format: FinancialReportQueryInput['format']) {
  if (format === 'pdf') return PDF_REPORT_LIMIT;
  if (format === 'xlsx') return XLSX_REPORT_LIMIT;
  return CSV_REPORT_LIMIT;
}

function oversizedMessage(format: FinancialReportQueryInput['format'], limit: number) {
  if (format === 'pdf') return `El PDF supera ${limit.toLocaleString('es-DO')} movimientos. Acota los filtros o usa XLSX/CSV.`;
  if (format === 'xlsx') return `El informe supera ${limit.toLocaleString('es-DO')} movimientos. Acota los filtros o usa CSV.`;
  return `La exportación supera ${limit.toLocaleString('es-DO')} movimientos. Reduce el período o aplica más filtros.`;
}

export class FinancialReportService {
  constructor(
    private readonly analytics: Pick<AnalyticsService, 'getSummary'>,
    private readonly transactions: Pick<TransactionApplicationService, 'export'>,
    private readonly budgets: Pick<GetMonthlyBudget, 'execute'>,
  ) {}

  async generate(workspaceId: string, query: FinancialReportQueryInput): Promise<GeneratedFinancialReport> {
    const scope = resolveReportScope(query);
    const { format, includeNotes, title: _title, sections: _sections, ...requestedFilters } = query;
    const filters = {
      ...requestedFilters, currency: scope.currency, month: undefined,
      startDate: scope.comparison?.current.startDate, endDate: scope.comparison?.current.endDate,
    };
    const limit = reportLimit(format);
    const transactions = await this.transactions.export(workspaceId, { ...filters, format: 'json' }, limit + 1);
    if (transactions.length > limit) throw new AppError(413, 'REPORT_TOO_LARGE', oversizedMessage(format, limit));

    const rows = financialRows(transactions, includeNotes);
    if (format === 'csv') {
      return {
        buffer: Buffer.from(stringify(rows, { header: true, bom: true }), 'utf8'),
        contentType: 'text/csv; charset=utf-8', extension: 'csv', rowCount: rows.length,
      };
    }

    const summary = await this.analytics.getSummary(workspaceId, filters, scope.comparison);
    const presentation = reportPresentation(query, scope);
    const budget = query.sections?.includes('budget')
      ? await this.budgets.execute(workspaceId, query.month!, scope.currency)
      : null;
    if (format === 'xlsx') {
      return {
        buffer: await renderXlsx(rows, summary, presentation, budget),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx', rowCount: rows.length,
      };
    }
    return {
      buffer: await renderPdf(rows, summary, presentation, scope.currency, includeNotes, budget),
      contentType: 'application/pdf', extension: 'pdf', rowCount: rows.length,
    };
  }
}
