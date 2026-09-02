import { afterEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { FinancialReportService } from '../src/modules/reports/application/financial-report.service';
import { AnalyticsService, type SummaryRequest } from '../src/modules/analytics';
import type { StoredTransaction } from '../src/modules/transactions';
import { resolveDateRange } from '../src/modules/transactions/domain/transaction-policy';
import type { AnalyticsTransaction } from '../src/modules/analytics/domain/summarize-transactions';

type Row = StoredTransaction & { statusCode: AnalyticsTransaction['statusCode'] };
function transaction(amount: number, overrides: Partial<Row> = {}): Row {
  return {
    id: String(amount), workspaceId: 'workspace-a', institutionCode: 'BHD', ingestionChannel: 'GMAIL',
    externalId: String(amount), cardLast4: '1234', cardType: null, rawMerchant: 'PRIVATE RAW', merchant: 'Bravo',
    category: 'Supermercado', amount: new Prisma.Decimal(amount), currency: 'DOP',
    status: 'Aprobada', statusCode: 'APPROVED', statusUpdatedAt: null, transactionType: 'Compra',
    transactionDate: new Date('2026-09-02T12:00:00Z'), source: 'BHD_EMAIL', notes: 'PRIVATE NOTE',
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

function services(rows: Row[]) {
  const select = (workspaceId: string, filters: SummaryRequest) => {
    const range = resolveDateRange(filters.month, filters.startDate, filters.endDate);
    return rows.filter((row) => row.workspaceId === workspaceId
      && (!filters.currency || row.currency === filters.currency)
      && (!range.gte || row.transactionDate >= range.gte)
      && (!range.lte || row.transactionDate <= range.lte));
  };
  const reader = { findTransactions: vi.fn(async (workspaceId: string, filters: SummaryRequest) => select(workspaceId, filters)), listCategories: async () => [] };
  const exporter = { export: vi.fn(async (workspaceId: string, filters: SummaryRequest) => select(workspaceId, filters)) };
  const budget = { execute: vi.fn() };
  return { service: new FinancialReportService(new AnalyticsService(reader), exporter, budget), reader, exporter };
}

afterEach(() => vi.useRealTimers());

describe('report reconciliation', () => {
  it('shares one Dominican cutoff and DOP default across detail and equivalent comparison', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-03T01:30:00Z'));
    const { service, reader, exporter } = services([
      transaction(100),
      transaction(20, { status: 'Rechazada', statusCode: 'DECLINED' }),
      transaction(30, { status: 'Pendiente', statusCode: 'PENDING' }),
      transaction(40, { status: 'Reversada', statusCode: 'REVERSED' }),
      transaction(700, { currency: 'USD' }), transaction(900, { workspaceId: 'workspace-b' }),
      transaction(500, { transactionDate: new Date('2026-09-03T12:00:00Z') }),
      transaction(50, { transactionDate: new Date('2026-08-01T12:00:00Z') }),
      transaction(1000, { transactionDate: new Date('2026-08-03T12:00:00Z') }),
    ]);
    const report = await service.generate('workspace-a', { format: 'xlsx', month: '2026-09', includeNotes: false });
    expect(report.rowCount).toBe(4);
    const current = { currency: 'DOP', month: undefined, startDate: '2026-09-01', endDate: '2026-09-02' };
    expect(exporter.export.mock.calls[0][0]).toBe('workspace-a');
    expect(exporter.export.mock.calls[0][1]).toMatchObject(current);
    expect(reader.findTransactions.mock.calls[0]).toMatchObject(['workspace-a', current]);
    expect(reader.findTransactions.mock.calls[1]).toMatchObject(['workspace-a', {
      currency: 'DOP', startDate: '2026-08-01', endDate: '2026-08-02',
    }]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    const comparison = (workbook.getWorksheet('Comparativa Mensual') || workbook.getWorksheet('Comparación'))!;
    const comparisonRows: unknown[][] = [];
    comparison.eachRow((row) => { comparisonRows.push(row.values as unknown[]); });
    expect(comparisonRows).toContainEqual([undefined, 'Gasto', 100, 50, 50]);
    const movements = workbook.getWorksheet('Movimientos')!;
    let effectiveTotal = 0;
    movements.eachRow((row) => {
      if (row.getCell(9).value === 'Aprobada') effectiveTotal += Number(row.getCell(7).value);
    });
    expect(effectiveTotal).toBe(100);
    expect(comparison.getColumn(2).values).toContain('2026-09-01 al 2026-09-02');
    expect(comparison.getColumn(2).values).toContain('2026-08-01 al 2026-08-02');
  });

  it('does not add a date restriction to all-time exports and uses USD consistently', async () => {
    const { service, reader, exporter } = services([
      transaction(100, { currency: 'USD' }),
      transaction(50, { currency: 'USD', transactionDate: new Date('2024-01-01T12:00:00Z') }),
      transaction(900),
    ]);
    const report = await service.generate('workspace-a', { format: 'xlsx', currency: 'usd', includeNotes: false });
    expect(report.rowCount).toBe(2);
    expect(reader.findTransactions).toHaveBeenCalledTimes(1);
    expect(exporter.export.mock.calls[0][1]).toMatchObject({ month: undefined, startDate: undefined, endDate: undefined, currency: 'USD' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer as unknown as ArrayBuffer);
    expect(workbook.getWorksheet('Resumen')!.getColumn(2).values).toContain('Todo el histórico');
    const compSheet = (workbook.getWorksheet('Comparativa Mensual') || workbook.getWorksheet('Comparación'))!;
    expect(compSheet.getColumn(2).values).toContain('Sin período comparable');
  });
});

