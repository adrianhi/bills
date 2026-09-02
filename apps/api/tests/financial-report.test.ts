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
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Comparativa Mensual', 'Categorías', 'Comercios', 'Movimientos']);
    expect(workbook.getWorksheet('Resumen')!.getColumn(1).values).not.toContain('Ingresos');
    expect(workbook.getWorksheet('Comparativa Mensual')!.getColumn(1).values).not.toContain('Ingreso');
    const movements = workbook.getWorksheet('Movimientos')!;
    expect(movements.rowCount).toBe(8);
    expect(movements.getRow(7).values).toContain('Bravo');
    expect(movements.getRow(8).values).toContain('Total');
    expect(movements.getCell('G8').value).toMatchObject({ formula: 'SUBTOTAL(109, G7:G7)' });
    expect(workbook.getWorksheet('Comparativa Mensual')!.getColumn(2).values).toContain('2026-07-01 al 2026-07-31');
    expect(movements.views[0]).toMatchObject({ state: 'frozen', showGridLines: false });
    expect(movements.autoFilter).toBeTruthy();

    // Check Resumen Executive Dashboard (KPI cards + Top 5)
    const resumen = workbook.getWorksheet('Resumen')!;
    expect(resumen.getCell('A6').value).toBe('GASTO TOTAL');
    expect(resumen.getCell('A7').value).toMatchObject({ formula: 'SUM(Movimientos!G7:G7)', result: 1500 });
    expect(resumen.getColumn(1).values).toContain('Top 5 Categorías de Mayor Gasto');
    expect(resumen.getColumn(1).values).toContain('Supermercado');

    // Check Comparativa Mensual MoM Matrix
    const compSheet = workbook.getWorksheet('Comparativa Mensual')!;
    expect(compSheet.getColumn(1).values).toContain('Desglose Mensual por Categoría (MoM)');
    expect(compSheet.getRow(12).values).toContain('Total Acumulado');
    expect(compSheet.getRow(12).values).toContain('Promedio Mensual');
    expect(compSheet.getRow(12).values).toContain('Variación MoM');
    expect(compSheet.getCell('D13').value).toMatchObject({ formula: 'SUM(B13:C13)', result: 1500 });

    // Check Categorías has formulas for % and totals
    const catSheet = workbook.getWorksheet('Categorías')!;
    expect(catSheet.getRow(6).values).toContain('Total Gastado');
    expect(catSheet.getRow(6).values).toContain('Distribución Visual');
    expect(catSheet.getCell('D7').value).toMatchObject({ formula: 'B7/$B$8', result: 1 });
    expect(catSheet.getCell('B8').value).toMatchObject({ formula: 'SUM(B7:B7)', result: 1500 });
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
    expect(workbook.getWorksheet('Movimientos')!.getRow(6).values).toContain('Notas');
    expect(workbook.getWorksheet('Movimientos')!.getCell('A7').value).toBeInstanceOf(Date);
    expect(workbook.getWorksheet('Movimientos')!.getCell('A7').numFmt).toBe('dd/mm/yyyy');
    expect(workbook.getWorksheet('Movimientos')!.getCell('B7').value).toBe("'=HYPERLINK(\"http://evil\")");
    expect(workbook.getWorksheet('Movimientos')!.getCell('J7').value).toBe('compra semanal');
  });

  it('includes resolved budget performance as an optional XLSX sheet with traffic light styling and formulas', async () => {
    const exceededBudget = {
      month: '2026-08', currency: 'DOP', hasBudget: true,
      totalSpent: 6500, totalPending: 0, unbudgetedSpent: 0,
      global: {
        scope: 'GLOBAL', categoryKey: null, categoryLabel: null, limit: 5000,
        spent: 6500, pending: 0, remaining: 0, exceededBy: 1500,
        percentUsed: 130, projected: null, status: 'EXCEEDED' as const,
      },
      categories: [
        {
          scope: 'CATEGORY' as const, categoryKey: 'supermercado', categoryLabel: 'Supermercado', limit: 2000,
          spent: 3500, pending: 0, remaining: 0, exceededBy: 1500,
          percentUsed: 175, projected: null, status: 'EXCEEDED' as const,
        },
        {
          scope: 'CATEGORY' as const, categoryKey: 'servicios', categoryLabel: 'Servicios', limit: 3000,
          spent: 2700, pending: 0, remaining: 300, exceededBy: 0,
          percentUsed: 90, projected: null, status: 'NEAR_LIMIT' as const,
        },
        {
          scope: 'CATEGORY' as const, categoryKey: 'transporte', categoryLabel: 'Transporte', limit: 1000,
          spent: 300, pending: 0, remaining: 700, exceededBy: 0,
          percentUsed: 30, projected: null, status: 'ON_TRACK' as const,
        },
      ],
      alerts: [],
    };
    const customBudgetReader = {
      execute: async () => exceededBudget,
    } as unknown as Pick<GetMonthlyBudget, 'execute'>;

    const analytics = { getSummary: async () => fakeSummary } as unknown as AnalyticsService;
    const transactionApp = { export: async () => [fakeTransaction()] } as unknown as TransactionApplicationService;
    const service = new FinancialReportService(analytics, transactionApp, customBudgetReader);

    const report = await service.generate('ws-1', {
      ...baseQuery, format: 'xlsx', sections: ['budget'],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Presupuesto']);
    const sheet = workbook.getWorksheet('Presupuesto')!;
    expect(sheet.getColumn(1).values).toContain('Presupuesto global');
    expect(sheet.getColumn(1).values).toContain('Supermercado');
    expect(sheet.getColumn(1).values).toContain('Servicios');
    expect(sheet.getColumn(1).values).toContain('Transporte');
    expect(sheet.getColumn(2).values).toContain(5000);

    // Check KPI card shows exceeded
    expect(sheet.getCell('E7').value).toContain('Excedido por RD$ 1,500.00');

    // Check status badges and formatting:
    // Row 12 is Presupuesto global (exceeded)
    expect(sheet.getCell('H12').value).toContain('▲ Excedido por RD$ 1,500.00');
    expect(sheet.getCell('E12').value).toMatchObject({ formula: 'MAX(0, B12-C12)' });
    expect(sheet.getCell('F12').value).toMatchObject({ formula: 'MAX(0, C12-B12)' });
    expect(sheet.getCell('G12').value).toMatchObject({ formula: 'IF(B12>0, C12/B12, 0)' });

    // Row 13 is Supermercado (exceeded)
    expect(sheet.getCell('H13').value).toContain('▲ Excedido');

    // Row 14 is Servicios (near limit: 90%)
    expect(sheet.getCell('H14').value).toBe('Cerca del límite');

    // Row 15 is Transporte (on track: 30%)
    expect(sheet.getCell('H15').value).toBe('En ritmo');

    // Total row at row 16
    expect(sheet.getCell('A16').value).toBe('Total');
    expect(sheet.getCell('B16').value).toMatchObject({ formula: 'SUM(B12:B15)' });
    expect(sheet.getCell('C16').value).toMatchObject({ formula: 'SUM(C12:C15)' });
  });

  it('generates a multi-month category matrix across 3 distinct months with MoM formulas', async () => {
    const multiMonthTransactions = [
      fakeTransaction({ id: 't1', transactionDate: new Date('2026-06-10T12:00:00Z'), category: 'Supermercado', amount: 1000 }),
      fakeTransaction({ id: 't2', transactionDate: new Date('2026-07-15T12:00:00Z'), category: 'Supermercado', amount: 2000 }),
      fakeTransaction({ id: 't3', transactionDate: new Date('2026-08-20T12:00:00Z'), category: 'Supermercado', amount: 3000 }),
      fakeTransaction({ id: 't4', transactionDate: new Date('2026-08-22T12:00:00Z'), category: 'Farmacia', amount: 500 }),
    ];
    const service = buildService(multiMonthTransactions);
    const report = await service.generate('ws-1', {
      startDate: '2026-06-01', endDate: '2026-08-31', currency: 'DOP',
      format: 'xlsx', sections: ['comparison', 'movements'],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    const compSheet = workbook.getWorksheet('Comparativa Mensual')!;

    // Check MoM matrix headers
    const headers = compSheet.getRow(12).values as unknown[];
    expect(headers).toContain('Jun 2026');
    expect(headers).toContain('Jul 2026');
    expect(headers).toContain('Ago 2026');
    expect(headers).toContain('Total Acumulado');
    expect(headers).toContain('Promedio Mensual');
    expect(headers).toContain('Variación MoM');

    // Supermercado row (row 13)
    expect(compSheet.getCell('A13').value).toBe('Supermercado');
    expect(compSheet.getCell('B13').value).toBe(1000);
    expect(compSheet.getCell('C13').value).toBe(2000);
    expect(compSheet.getCell('D13').value).toBe(3000);
    expect(compSheet.getCell('E13').value).toMatchObject({ formula: 'SUM(B13:D13)' });
    expect(compSheet.getCell('F13').value).toMatchObject({ formula: 'AVERAGE(B13:D13)' });
    expect(compSheet.getCell('G13').value).toMatchObject({ formula: 'IF(C13>0, (D13-C13)/C13, IF(D13>0, 1, 0))' });

    // Farmacia row (row 14)
    expect(compSheet.getCell('A14').value).toBe('Farmacia');

    // Total General row (row 15)
    expect(compSheet.getCell('A15').value).toBe('Total General');
    expect(compSheet.getCell('B15').value).toMatchObject({ formula: 'SUM(B13:B14)' });
    expect(compSheet.getCell('C15').value).toMatchObject({ formula: 'SUM(C13:C14)' });
    expect(compSheet.getCell('D15').value).toMatchObject({ formula: 'SUM(D13:D14)' });
    expect(compSheet.getCell('E15').value).toMatchObject({ formula: 'SUM(E13:E14)' });

    // Movimientos has Excel Table with 4 rows + totals row
    const movements = workbook.getWorksheet('Movimientos')!;
    expect(movements.rowCount).toBe(11); // 4 metadata + 1 empty + 1 header + 4 data + 1 total = 11
    expect(movements.getCell('G11').value).toMatchObject({ formula: 'SUBTOTAL(109, G7:G10)' });
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
