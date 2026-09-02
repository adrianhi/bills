import ExcelJS from 'exceljs';
import type { FinancialRow, ReportBudget, ReportPresentation, ReportSummary } from './financial-report-data';
import { safeSpreadsheetText } from './financial-report-data';
import { addDashboardSheet } from './xlsx-dashboard-sheet';
import { addBudgetSheet } from './xlsx-budget-sheet';
import { addComparisonSheet } from './xlsx-comparison-sheet';
import {
  BORDER,
  DARK,
  GREEN,
  MINT,
  getColumnLetter,
  styleDataRow,
  styleTableHeader,
  titleRows,
} from './xlsx-report.styles';

type Breakdown = { label: string; total: number; count: number; percentage: number };

function addBreakdown(workbook: ExcelJS.Workbook, name: string, items: Breakdown[], presentation: ReportPresentation) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 6, showGridLines: false }] });
  titleRows(sheet, presentation, 5);

  sheet.addRow([]);

  const labelTitle = name === 'Categorías' ? 'Categoría' : 'Comercio';
  const headerRow = sheet.addRow([labelTitle, 'Total Gastado', 'Movimientos', '% del Gasto', 'Distribución Visual']);
  styleTableHeader(headerRow);

  const totalRowNumber = 7 + items.length;
  const totalAmount = items.reduce((s, i) => s + i.total, 0);
  const totalCount = items.reduce((s, i) => s + i.count, 0);

  if (items.length) {
    items.forEach((item, idx) => {
      const r = 7 + idx;
      const pct = totalAmount > 0 ? item.total / totalAmount : 0;
      const barCount = Math.min(20, Math.max(1, Math.round(pct * 20)));

      const row = sheet.addRow([
        safeSpreadsheetText(item.label),
        item.total,
        item.count,
        { formula: `B${r}/$B$${totalRowNumber}`, result: pct },
        { formula: `REPT("■", ROUND(D${r}*20, 0))`, result: '■'.repeat(barCount) },
      ]);

      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).numFmt = '0.0%';
      row.getCell(5).font = { bold: true, color: { argb: GREEN } };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };

      styleDataRow(row, idx % 2 === 1);
    });

    // Total row
    const totalRow = sheet.addRow([
      'Total General',
      { formula: `SUM(B7:B${totalRowNumber - 1})`, result: totalAmount },
      { formula: `SUM(C7:C${totalRowNumber - 1})`, result: totalCount },
      { formula: `IF(B${totalRowNumber}>0, 1, 0)`, result: 1.0 },
      '',
    ]);

    totalRow.height = 24;
    totalRow.getCell(2).numFmt = '#,##0.00';
    totalRow.getCell(3).numFmt = '#,##0';
    totalRow.getCell(4).numFmt = '0.0%';

    totalRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MINT } };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'double', color: { argb: DARK } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  } else {
    const emptyRow = sheet.addRow(['Sin registros para el período', 0, 0, 0, '']);
    styleDataRow(emptyRow, false);
  }

  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 22;
  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: totalRowNumber - 1, column: 5 } };
}

function addMovements(workbook: ExcelJS.Workbook, rows: FinancialRow[], presentation: ReportPresentation) {
  const columns = rows[0]
    ? Object.keys(rows[0])
    : ['Fecha', 'Comercio', 'Categoría', 'Tipo', 'Banco', 'Cuenta', 'Monto', 'Moneda', 'Estado'];
  const sheet = workbook.addWorksheet('Movimientos', { views: [{ state: 'frozen', ySplit: 6, showGridLines: false }] });
  titleRows(sheet, presentation, columns.length);

  sheet.addRow([]);

  const headerRow = sheet.addRow(columns);
  styleTableHeader(headerRow);
  headerRow.height = 26;

  const amountColIndex = columns.indexOf('Monto') + 1;
  const dateColIndex = columns.indexOf('Fecha') + 1;

  rows.forEach((row, idx) => {
    const values = columns.map((column) => {
      const value = row[column as keyof FinancialRow] ?? '';
      if (value === '') return null;
      if (column === 'Fecha' && typeof value === 'string') {
        const [day, month, year] = value.split('/').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12));
      }
      return value;
    });

    const dataRow = sheet.addRow(values);
    styleDataRow(dataRow, idx % 2 === 1);

    if (String(row.Comercio).length > 28 || ('Notas' in row && row.Notas)) {
      dataRow.height = 36;
    } else {
      dataRow.height = 22;
    }
  });

  const lastDataRow = 6 + rows.length;
  const totalRowIndex = lastDataRow + 1;
  const amountSum = rows.reduce((s, r) => s + (Number(r.Monto) || 0), 0);

  const totalValues: unknown[] = new Array(columns.length).fill('');
  if (dateColIndex > 0) totalValues[dateColIndex - 1] = 'Total';
  const totalRow = sheet.addRow(totalValues);
  totalRow.height = 24;

  if (amountColIndex > 0) {
    const colLetter = getColumnLetter(amountColIndex);
    totalRow.getCell(amountColIndex).value = rows.length
      ? { formula: `SUBTOTAL(109, ${colLetter}7:${colLetter}${lastDataRow})`, result: amountSum }
      : 0;
    totalRow.getCell(amountColIndex).numFmt = '#,##0.00';
  }

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: DARK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MINT } };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'double', color: { argb: DARK } },
    };
    cell.alignment = { vertical: 'middle' };
  });

  if (dateColIndex > 0) {
    sheet.getColumn(dateColIndex).numFmt = 'dd/mm/yyyy';
  }
  if (amountColIndex > 0) {
    sheet.getColumn(amountColIndex).numFmt = '#,##0.00';
  }

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width =
      column === 'Comercio' || column === 'Notas'
        ? 32
        : column === 'Categoría' || column === 'Banco'
          ? 24
          : 16;
  });

  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: lastDataRow, column: columns.length } };
  }
}

export async function renderXlsx(
  rows: FinancialRow[],
  summary: ReportSummary,
  presentation: ReportPresentation,
  budget: ReportBudget = null,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'bills.';
  workbook.created = new Date();
  const selected = new Set(presentation.sections);

  if (selected.has('summary')) addDashboardSheet(workbook, summary, presentation, budget, rows);
  if (selected.has('budget')) addBudgetSheet(workbook, budget, presentation);
  if (selected.has('comparison')) addComparisonSheet(workbook, summary, presentation, rows);
  if (selected.has('categories')) {
    addBreakdown(
      workbook,
      'Categorías',
      summary.byCategory.map((item) => ({
        label: item.category,
        total: item.total,
        count: item.count,
        percentage: item.percentage,
      })),
      presentation,
    );
  }
  if (selected.has('merchants')) {
    addBreakdown(
      workbook,
      'Comercios',
      summary.byMerchant.map((item) => ({
        label: item.merchant,
        total: item.total,
        count: item.count,
        percentage: summary.totalAmount > 0 ? (item.total / summary.totalAmount) * 100 : 0,
      })),
      presentation,
    );
  }
  if (selected.has('movements')) addMovements(workbook, rows, presentation);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
