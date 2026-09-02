import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { FinancialReportService, safeSpreadsheetText } from '../src/modules/reports/application/financial-report.service';
import type { AnalyticsService } from '../src/modules/analytics/application/analytics.service';
import type { TransactionApplicationService } from '../src/modules/transactions/application/transaction-application.service';
import type { GetMonthlyBudget } from '../src/modules/budgets';
import { FinancialReportQuerySchema, type FinancialReportQueryInput } from '../src/schemas/transaction.schema';

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
  approvedCount: 1,
  totalTransactions: 1,
  insights: [{ code: 'SPENDING_INCREASED', tone: 'warning', title: 'Gastaste más', description: 'La diferencia es de 1,500 DOP.' }],
  byCategory: [{ category: 'Supermercado', total: 1500, count: 1, percentage: 100 }],
  byMerchant: [{ name: 'Bravo', merchant: 'Bravo', total: 1500, totalDOP: 1500, totalUSD: 0, count: 1 }],
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

const fakeBudget = {
  month: '2026-08', currency: 'DOP', hasBudget: true,
  totalSpent: 1500, totalPending: 200, unbudgetedSpent: 0,
  global: {
    scope: 'GLOBAL', categoryKey: null, categoryLabel: null, limit: 5000,
    spent: 1500, pending: 200, remaining: 3500, exceededBy: 0,
    percentUsed: 30, projected: null, status: 'ON_TRACK',
  },
  categories: [{
    scope: 'CATEGORY', categoryKey: 'supermercado', categoryLabel: 'Supermercado', limit: 2000,
    spent: 1500, pending: 200, remaining: 500, exceededBy: 0,
    percentUsed: 75, projected: null, status: 'ON_TRACK',
  }],
  alerts: [],
} as const;

const budgetReader = {
  execute: async () => fakeBudget,
} as unknown as Pick<GetMonthlyBudget, 'execute'>;

function buildService(transactions: Array<Record<string, unknown>>) {
  const analytics = { getSummary: async () => fakeSummary } as unknown as AnalyticsService;
  const transactionApp = { export: async () => transactions } as unknown as TransactionApplicationService;
  return new FinancialReportService(analytics, transactionApp, budgetReader);
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
  it('normalizes multi-bank and section query parameters', () => {
    expect(FinancialReportQuerySchema.parse({
      format: 'pdf', institutionCodes: 'bhd,POPULAR,bhd,qik', sections: 'summary,movements', includeNotes: 'true',
    })).toMatchObject({
      institutionCodes: ['BHD', 'POPULAR', 'QIK'], sections: ['summary', 'movements'], includeNotes: true,
    });
  });

  it('applies the same combined filters to rows and analytics', async () => {
    let exportedFilters: Record<string, unknown> = {};
    let analyticsFilters: Record<string, unknown> = {};
    const analytics = { getSummary: async (_workspaceId: string, filters: Record<string, unknown>) => {
      analyticsFilters = filters; return fakeSummary;
    } } as unknown as AnalyticsService;
    const transactionApp = { export: async (_workspaceId: string, filters: Record<string, unknown>) => {
      exportedFilters = filters; return [fakeTransaction()];
    } } as unknown as TransactionApplicationService;
    const service = new FinancialReportService(analytics, transactionApp, budgetReader);
    await service.generate('ws-1', {
      ...baseQuery, format: 'pdf', institutionCodes: ['BHD', 'POPULAR'], category: 'Supermercado',
      status: 'APPROVED', transactionType: 'compra', search: 'Bravo', title: 'Privado', sections: ['summary'],
    });
    expect(analyticsFilters).toMatchObject({
      institutionCodes: ['BHD', 'POPULAR'], category: 'Supermercado', status: 'APPROVED', transactionType: 'compra', search: 'Bravo',
    });
    expect(exportedFilters).toMatchObject({ ...analyticsFilters, format: 'json' });
    expect(exportedFilters).not.toHaveProperty('title');
    expect(exportedFilters).not.toHaveProperty('sections');
  });

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
    expect(workbook.getWorksheet('Resumen')!.getColumn(1).values).not.toContain('Ingresos');
    expect(workbook.getWorksheet('Comparación')!.getColumn(1).values).not.toContain('Ingreso');
    const movements = workbook.getWorksheet('Movimientos')!;
    expect(movements.rowCount).toBe(9);
    expect(movements.getRow(9).values).toContain('Bravo');
    expect(workbook.getWorksheet('Comparación')!.getColumn(2).values).toContain('2026-07-01 al 2026-07-31');
    expect(movements.views[0]).toMatchObject({ state: 'frozen', showGridLines: false });
    expect(movements.autoFilter).toBeTruthy();
  });

  it('uses the requested title, sections and notes in XLSX', async () => {
    const service = buildService([fakeTransaction({ merchant: '=HYPERLINK("http://evil")' })]);
    const report = await service.generate('ws-1', {
      ...baseQuery, format: 'xlsx', includeNotes: true, title: 'Gastos del equipo', sections: ['summary', 'movements'],
      institutionCodes: ['BHD', 'POPULAR'],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Movimientos']);
    expect(workbook.getWorksheet('Resumen')!.getCell('A1').value).toBe('Gastos del equipo');
    expect(workbook.getWorksheet('Resumen')!.getColumn(2).values).toContain('Banco BHD, Banco Popular');
    expect(workbook.getWorksheet('Movimientos')!.getRow(8).values).toContain('Notas');
    expect(workbook.getWorksheet('Movimientos')!.getCell('A9').value).toBeInstanceOf(Date);
    expect(workbook.getWorksheet('Movimientos')!.getCell('A9').numFmt).toBe('dd/mm/yyyy');
    expect(workbook.getWorksheet('Movimientos')!.getCell('B9').value).toBe("'=HYPERLINK(\"http://evil\")");
    expect(workbook.getWorksheet('Movimientos')!.getCell('J9').value).toBe('compra semanal');
  });

  it('includes resolved budget performance as an optional XLSX sheet', async () => {
    const service = buildService([fakeTransaction()]);
    const report = await service.generate('ws-1', {
      ...baseQuery, format: 'xlsx', sections: ['budget'],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Presupuesto']);
    const sheet = workbook.getWorksheet('Presupuesto')!;
    expect(sheet.getColumn(1).values).toContain('Presupuesto global');
    expect(sheet.getColumn(1).values).toContain('Supermercado');
    expect(sheet.getColumn(2).values).toContain(5000);
    expect(sheet.getColumn(8).values).toContain('En ritmo');
  });

  it('restricts budget sections to an unfiltered calendar month in PDF or XLSX', () => {
    expect(FinancialReportQuerySchema.safeParse({
      format: 'xlsx', month: '2026-08', currency: 'DOP', sections: 'budget',
    }).success).toBe(true);
    expect(FinancialReportQuerySchema.safeParse({
      format: 'csv', month: '2026-08', currency: 'DOP', sections: 'budget',
    }).success).toBe(false);
    expect(FinancialReportQuerySchema.safeParse({
      format: 'pdf', month: '2026-08', currency: 'DOP', sections: 'budget', institutionCodes: 'BHD',
    }).success).toBe(false);
    expect(FinancialReportQuerySchema.safeParse({
      format: 'pdf', startDate: '2026-08-01', endDate: '2026-08-31', currency: 'DOP', sections: 'budget',
    }).success).toBe(false);
    expect(FinancialReportQuerySchema.safeParse({
      format: 'pdf', month: '2026-13', currency: 'DOP', sections: 'budget',
    }).success).toBe(false);
  });

  it('generates a PDF report in memory', async () => {
    const service = buildService([fakeTransaction()]);
    const report = await service.generate('ws-1', { ...baseQuery, format: 'pdf' });
    expect(report.extension).toBe('pdf');
    expect(report.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('rejects PDFs over 500 rows and suggests a filtered or tabular export', async () => {
    const service = buildService(Array.from({ length: 501 }, () => fakeTransaction()));
    await expect(service.generate('ws-1', { ...baseQuery, format: 'pdf' })).rejects.toMatchObject({
      statusCode: 413, code: 'REPORT_TOO_LARGE', message: expect.stringContaining('XLSX/CSV'),
    });
  });

  it('keeps the XLSX limit at 5,000 rows', async () => {
    const service = buildService(Array.from({ length: 5_001 }, () => fakeTransaction()));
    await expect(service.generate('ws-1', { ...baseQuery, format: 'xlsx' })).rejects.toMatchObject({ statusCode: 413, code: 'REPORT_TOO_LARGE' });
  });
});
