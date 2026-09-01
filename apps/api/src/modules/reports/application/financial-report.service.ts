import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AppError } from '../../../errors/app-error';
import type { FinancialReportQueryInput } from '../../../schemas/transaction.schema';
import { AnalyticsService } from '../../analytics/application/analytics.service';
import { institutionDisplayName } from '../../transactions/domain/transaction-policy';
import { TransactionApplicationService } from '../../transactions/application/transaction-application.service';

const RICH_REPORT_LIMIT = 5_000;
const CSV_REPORT_LIMIT = 25_000;

const formulaPrefix = /^[\s]*[=+\-@]/;
export const safeSpreadsheetText = (value: unknown) => {
  const text = String(value ?? '');
  return formulaPrefix.test(text) ? `'${text}` : text;
};

const formatDate = (value: Date) => new Intl.DateTimeFormat('es-DO', {
  timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value);

const amount = (value: unknown) => Number(value);

type ReportTransaction = Awaited<ReturnType<TransactionApplicationService['export']>>[number];

function financialRows(transactions: ReportTransaction[], includeNotes: boolean) {
  return transactions.map((transaction) => ({
    Fecha: formatDate(transaction.transactionDate),
    Comercio: safeSpreadsheetText(transaction.merchant),
    Categoría: safeSpreadsheetText(transaction.category),
    Tipo: safeSpreadsheetText(transaction.transactionType),
    Banco: institutionDisplayName(transaction.institutionCode),
    Cuenta: transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : '',
    Monto: amount(transaction.amount),
    Moneda: transaction.currency,
    Estado: safeSpreadsheetText(transaction.status),
    ...(includeNotes ? { Notas: safeSpreadsheetText(transaction.notes) } : {}),
  }));
}

const currencyValue = (value: number, currency: string) => `${currency} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface GeneratedFinancialReport {
  buffer: Buffer;
  contentType: string;
  extension: 'csv' | 'xlsx' | 'pdf';
  rowCount: number;
}

export class FinancialReportService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly transactions: TransactionApplicationService,
  ) {}

  async generate(workspaceId: string, query: FinancialReportQueryInput): Promise<GeneratedFinancialReport> {
    const { format, includeNotes, ...filters } = query;
    const limit = format === 'csv' ? CSV_REPORT_LIMIT : RICH_REPORT_LIMIT;
    const transactions = await this.transactions.export(workspaceId, { ...filters, format: 'json' }, limit + 1);
    if (transactions.length > limit) {
      throw new AppError(413, 'REPORT_TOO_LARGE', format === 'csv'
        ? `La exportación supera el límite de ${CSV_REPORT_LIMIT.toLocaleString('es-DO')} movimientos. Reduce el período o aplica más filtros.`
        : `El informe supera ${RICH_REPORT_LIMIT.toLocaleString('es-DO')} movimientos. Reduce el período o usa CSV.`);
    }
    const summary = await this.analytics.getSummary(workspaceId, filters);
    const rows = financialRows(transactions, includeNotes);
    if (format === 'csv') return this.csv(rows);
    if (format === 'xlsx') return this.xlsx(rows, summary, filters.currency || 'DOP');
    return this.pdf(summary, filters.currency || 'DOP', transactions.length);
  }

  private csv(rows: ReturnType<typeof financialRows>): GeneratedFinancialReport {
    return { buffer: Buffer.from(stringify(rows, { header: true, bom: true }), 'utf8'), contentType: 'text/csv; charset=utf-8', extension: 'csv', rowCount: rows.length };
  }

  private async xlsx(rows: ReturnType<typeof financialRows>, summary: Awaited<ReturnType<AnalyticsService['getSummary']>>, currency: string): Promise<GeneratedFinancialReport> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'bills.';
    workbook.created = new Date();
    const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF059669' } } };

    const overview = workbook.addWorksheet('Resumen');
    overview.addRows([
      ['Informe financiero', 'bills.'], ['Período', summary.period], ['Moneda', currency],
      ['Gasto total', summary.totalAmount],
      ['Promedio diario', summary.dailyAverage], ['Ticket promedio', summary.averageTicket || 0],
      ['Movimientos', summary.totalTransactions],
    ]);
    overview.getColumn(1).width = 24; overview.getColumn(2).width = 32;
    overview.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    for (let row = 4; row <= 6; row += 1) overview.getCell(row, 2).numFmt = '#,##0.00';

    const comparison = workbook.addWorksheet('Comparación');
    comparison.addRow(['Métrica', 'Período actual', 'Período anterior', 'Diferencia']);
    comparison.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    const comparisonData = 'comparison' in summary && summary.comparison ? summary.comparison : null;
    if (comparisonData) {
      comparison.addRows([
        ['Gasto', comparisonData.currentPeriod.totalAmount, comparisonData.previousPeriod.totalAmount, comparisonData.expenseChangeAmount],
        ['Promedio diario', comparisonData.currentPeriod.dailyAverage, comparisonData.previousPeriod.dailyAverage, comparisonData.currentPeriod.dailyAverage - comparisonData.previousPeriod.dailyAverage],
      ]);
      comparison.columns.forEach((column) => { column.width = 22; });
      comparison.eachRow((row, index) => { if (index > 1) for (let column = 2; column <= 4; column += 1) row.getCell(column).numFmt = '#,##0.00'; });
    } else comparison.addRow(['Sin período comparable']);

    const addBreakdown = (name: string, items: Array<{ name?: string; category?: string; merchant?: string; currentTotal?: number; previousTotal?: number; changeAmount?: number; total?: number; percentage?: number }>) => {
      const sheet = workbook.addWorksheet(name);
      sheet.addRow(['Nombre', 'Actual', 'Anterior', 'Diferencia', '% del gasto']);
      sheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
      items.forEach((item) => sheet.addRow([safeSpreadsheetText(item.name || item.category || item.merchant), item.currentTotal ?? item.total ?? 0, item.previousTotal ?? 0, item.changeAmount ?? 0, item.percentage ?? '']));
      sheet.columns.forEach((column, index) => { column.width = index === 0 ? 30 : 18; });
    };
    addBreakdown('Categorías', comparisonData?.categoryDeltas ?? summary.byCategory);
    addBreakdown('Comercios', comparisonData?.merchantDeltas ?? ((summary as { byMerchant?: Array<{ merchant: string; total: number }> }).byMerchant || []));

    const movements = workbook.addWorksheet('Movimientos');
    const columns = rows[0] ? Object.keys(rows[0]) : ['Fecha', 'Comercio', 'Categoría', 'Tipo', 'Banco', 'Cuenta', 'Monto', 'Moneda', 'Estado'];
    movements.columns = columns.map((key) => ({ header: key, key, width: key === 'Comercio' || key === 'Notas' ? 30 : 18 }));
    movements.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    rows.forEach((row) => movements.addRow(row));
    const amountColumn = columns.indexOf('Monto') + 1;
    if (amountColumn > 0) movements.getColumn(amountColumn).numFmt = '#,##0.00';
    movements.views = [{ state: 'frozen', ySplit: 1 }];
    movements.autoFilter = { from: 'A1', to: movements.getRow(1).getCell(columns.length).address };

    const output = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(output), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', rowCount: rows.length };
  }

  private pdf(summary: Awaited<ReturnType<AnalyticsService['getSummary']>>, currency: string, rowCount: number): Promise<GeneratedFinancialReport> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Informe financiero bills.', Author: 'bills.' } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: 'application/pdf', extension: 'pdf', rowCount }));
      doc.fillColor('#064e3b').fontSize(24).text('bills.');
      doc.fillColor('#111827').fontSize(18).text('Informe financiero', { continued: false });
      doc.moveDown(0.3).fillColor('#6b7280').fontSize(10).text(`Período: ${summary.period} · Moneda: ${currency} · Generado: ${formatDate(new Date())}`);
      doc.moveDown(1.2).fillColor('#111827').fontSize(13).text('Resumen');
      doc.fontSize(11).text(`Gasto total: ${currencyValue(summary.totalAmount, currency)}`);
      doc.text(`Promedio diario: ${currencyValue(summary.dailyAverage, currency)}`);
      doc.text(`Ticket promedio: ${currencyValue(summary.averageTicket || 0, currency)}`);
      doc.text(`Movimientos: ${summary.totalTransactions}`);
      const comparisonData = 'comparison' in summary && summary.comparison ? summary.comparison : null;
      if (comparisonData) {
        doc.moveDown().fontSize(13).text('Comparación equivalente');
        doc.fontSize(10).fillColor('#374151').text(`${comparisonData.currentPeriod.startDate} al ${comparisonData.currentPeriod.endDate} frente a ${comparisonData.previousPeriod.startDate} al ${comparisonData.previousPeriod.endDate}.`);
        doc.text(`Diferencia: ${currencyValue(comparisonData.expenseChangeAmount, currency)}${comparisonData.expenseChangePercent === null ? ' (sin base porcentual)' : ` (${comparisonData.expenseChangePercent}%)`}.`);
      }
      if (summary.insights.length > 0) {
        doc.moveDown().fillColor('#111827').fontSize(13).text('Lo más importante');
        summary.insights.forEach((insight) => { doc.moveDown(0.45).fontSize(11).text(`• ${insight.title}`, { continued: false }); doc.fillColor('#4b5563').fontSize(9).text(insight.description); doc.fillColor('#111827'); });
      }
      doc.moveDown().fontSize(13).text('Principales categorías');
      summary.byCategory.slice(0, 8).forEach((item) => doc.fontSize(10).text(`${item.category}: ${currencyValue(item.total, currency)} · ${item.percentage}%`));
      doc.moveDown(1.5).fillColor('#6b7280').fontSize(8).text('Este informe se generó bajo demanda y no se almacena. Las proyecciones describen el ritmo observado y no constituyen asesoría financiera.');
      doc.end();
    });
  }
}

