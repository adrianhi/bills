import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { FinancialReportService, safeSpreadsheetText } from '../src/modules/reports/application/financial-report.service';
import type { AnalyticsService } from '../src/modules/analytics/application/analytics.service';
import type { TransactionApplicationService } from '../src/modules/transactions/application/transaction-application.service';
import type { FinancialReportQueryInput } from '../src/schemas/transaction.schema';

const fakeTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  transactionDate: new Date('2026-08-10T15:00:00.000Z'),
  merchant: 'Bravo',
  category: 'Supermercado',
  transactionType: 'Compra',
  institutionCode: 'BHD',
  cardLast4: '1234',
  amount: 1500,
  currency: 'DOP',
  status: 'Aprobada',
  notes: 'compra semanal',
  ...overrides,
});

const fakeSummary = {
  period: '2026-08',
  currency: 'DOP',
  totalAmount: 1500,
  totalIncome: 0,
  dailyAverage: 150,
  averageTicket: 1500,
  totalTransactions: 1,
  insights: [{ code: 'SPENDING_INCREASED', tone: 'warning', title: 'Gastaste más', description: 'La diferencia es de 1,500 DOP.' }],
  byCategory: [{ category: 'Supermercado', total: 1500, count: 1, percentage: 100 }],
  comparison: {
    previousTotalAmount: 0,
    previousTotalIncome: 0,
    expenseChangeAmount: 1500,
    expenseChangePercent: null,
    incomeChangePercent: null,
    currentPeriod: { startDate: '2026-08-01', endDate: '2026-08-15', days: 15, totalAmount: 1500, totalIncome: 0, dailyAverage: 150, transactionCount: 1 },
    previousPeriod: { startDate: '2026-07-01', endDate: '2026-07-15', days: 15, totalAmount: 0, totalIncome: 0, dailyAverage: 0, transactionCount: 0 },
    categoryDeltas: [{ name: 'Supermercado', currentTotal: 1500, previousTotal: 0, changeAmount: 1500, changePercent: null }],
    merchantDeltas: [{ name: 'Bravo', currentTotal: 1500, previousTotal: 0, changeAmount: 1500, changePercent: null }],
  },
};

function buildService(transactions: Array<Record<string, unknown>>) {
  const analytics = { getSummary: async () => fakeSummary } as unknown as AnalyticsService;
  const transactionApp = { export: async () => transactions } as unknown as TransactionApplicationService;
  return new FinancialReportService(analytics, transactionApp);
}

const baseQuery: FinancialReportQueryInput = { format: 'csv', includeNotes: false, month: '2026-08', currency: 'DOP' };

describe('safeSpreadsheetText', () => {
  it('prefixes formula-like values to prevent spreadsheet injection', () => {
    expect(safeSpreadsheetText('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(safeSpreadsheetText('+1+1')).toBe("'+1+1");
    expect(safeSpreadsheetText('  -10')).toBe("'  -10");
    expect(safeSpreadsheetText('@cmd')).toBe("'@cmd");
  });
  it('keeps normal text untouched', () => {
    expect(safeSpreadsheetText('Bravo Supermercado')).toBe('Bravo Supermercado');
    expect(safeSpreadsheetText(null)).toBe('');
  });
});

describe('FinancialReportService', () => {
  it('generates a UTF-8 CSV with BOM and no notes column by default', async () => {
    const service = buildService([fakeTransaction()]);
    const report = await service.generate('ws-1', baseQuery);
    expect(report.extension).toBe('csv');
    expect(report.rowCount).toBe(1);
    const text = report.buffer.toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('Comercio');
    expect(text).toContain('Bravo');
    expect(text).not.toContain('Notas');
  });

  it('sanitizes formula-like values in CSV and includes notes only on demand', async () => {
    const service = buildService([fakeTransaction({ merchant: '=HYPERLINK("http://evil")' })]);
    const report = await service.generate('ws-1', { ...baseQuery, includeNotes: true });
    const text = report.buffer.toString('utf8');
    expect(text).toContain('Notas');
    expect(text).toContain('compra semanal');
    expect(text).toContain("'=HYPERLINK");
    expect(text).not.toContain('\n=HYPERLINK');
  });

  it('generates an XLSX workbook with the expected sheets', async () => {
    const service = buildService([fakeTransaction()]);
    const report = await service.generate('ws-1', { ...baseQuery, format: 'xlsx' });
    expect(report.extension).toBe('xlsx');
    expect(report.buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Comparación', 'Categorías', 'Comercios', 'Movimientos']);
    const movements = workbook.getWorksheet('Movimientos')!;
    expect(movements.rowCount).toBe(2);
  });

  it('generates a PDF report in memory', async () => {
    const service = buildService([fakeTransaction()]);
    const report = await service.generate('ws-1', { ...baseQuery, format: 'pdf' });
    expect(report.extension).toBe('pdf');
    expect(report.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('rejects oversized exports with a readable error suggesting CSV', async () => {
    const service = buildService(Array.from({ length: 5_001 }, () => fakeTransaction()));
    await expect(service.generate('ws-1', { ...baseQuery, format: 'xlsx' })).rejects.toMatchObject({ statusCode: 413, code: 'REPORT_TOO_LARGE' });
  });
});
