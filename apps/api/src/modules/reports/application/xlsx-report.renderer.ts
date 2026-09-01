import ExcelJS from 'exceljs';
import type { FinancialRow, ReportPresentation, ReportSummary } from './financial-report-data';
import { safeSpreadsheetText } from './financial-report-data';

const GREEN = 'FF047857';
const DARK = 'FF064E3B';
const MINT = 'FFD1FAE5';
const LIGHT = 'FFF8FAFC';
const BORDER = 'FFE2E8F0';

function titleRows(sheet: ExcelJS.Worksheet, presentation: ReportPresentation, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  const title = sheet.getCell(1, 1);
  title.value = presentation.title;
  title.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 34;
  presentation.metadata.forEach((item, index) => {
    const row = sheet.getRow(index + 2);
    row.getCell(1).value = item.label;
    row.getCell(1).font = { bold: true, color: { argb: DARK } };
    sheet.mergeCells(index + 2, 2, index + 2, columns);
    row.getCell(2).value = safeSpreadsheetText(item.value);
    row.getCell(2).font = { color: { argb: 'FF475569' } };
  });
  return sheet.rowCount;
}

function styleTable(sheet: ExcelJS.Worksheet, headerRow: number, columns: number, amountColumns: number[] = []) {
  const header = sheet.getRow(headerRow);
  header.height = 25;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  for (let rowIndex = headerRow + 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    if (!row.height) row.height = 22;
    if ((rowIndex - headerRow) % 2 === 0) {
      row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }; });
    }
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  }
  amountColumns.forEach((column) => { sheet.getColumn(column).numFmt = '#,##0.00'; });
  sheet.views = [{ state: 'frozen', ySplit: headerRow }];
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns } };
}

function addSummary(workbook: ExcelJS.Workbook, summary: ReportSummary, presentation: ReportPresentation) {
  const sheet = workbook.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  const start = titleRows(sheet, presentation, 4);
  sheet.addRow([]);
  sheet.addRow(['Métrica', 'Valor', 'Métrica', 'Valor']);
  sheet.addRow(['Gasto total', summary.totalAmount, 'Operaciones aprobadas', summary.approvedCount]);
  sheet.addRow(['Promedio diario', summary.dailyAverage, 'Ticket promedio', summary.averageTicket || 0]);
  styleTable(sheet, start + 2, 4, [2, 4]);
  sheet.getColumn(1).width = 26; sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 26; sheet.getColumn(4).width = 20;
  sheet.getRow(start + 3).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MINT } }; });
  sheet.getCell(start + 3, 4).numFmt = '#,##0';
  if (summary.insights.length) {
    sheet.addRow([]);
    const insightHeader = sheet.addRow(['Insights']);
    insightHeader.getCell(1).font = { bold: true, color: { argb: DARK }, size: 13 };
    summary.insights.forEach((insight) => {
      const titleRow = sheet.addRow([safeSpreadsheetText(insight.title)]);
      sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);
      titleRow.getCell(1).font = { bold: true, color: { argb: DARK } };
      const descriptionRow = sheet.addRow([safeSpreadsheetText(insight.description)]);
      sheet.mergeCells(descriptionRow.number, 1, descriptionRow.number, 4);
      descriptionRow.getCell(1).font = { color: { argb: 'FF475569' }, italic: true };
      descriptionRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      descriptionRow.height = 28;
    });
  }
}

function addComparison(workbook: ExcelJS.Workbook, summary: ReportSummary, presentation: ReportPresentation) {
  const sheet = workbook.addWorksheet('Comparación', { views: [{ showGridLines: false }] });
  const headerRow = titleRows(sheet, presentation, 4) + 1;
  sheet.addRow(['Métrica', 'Período actual', 'Período anterior', 'Diferencia']);
  const comparison = 'comparison' in summary ? summary.comparison : undefined;
  if (comparison) sheet.addRows([
    ['Gasto', comparison.currentPeriod.totalAmount, comparison.previousPeriod.totalAmount, comparison.expenseChangeAmount],
    ['Promedio diario', comparison.currentPeriod.dailyAverage, comparison.previousPeriod.dailyAverage, comparison.currentPeriod.dailyAverage - comparison.previousPeriod.dailyAverage],
  ]);
  else sheet.addRow(['Sin período comparable', '', '', '']);
  styleTable(sheet, headerRow, 4, [2, 3, 4]);
  sheet.columns.forEach((column) => { column.width = 24; });
}

type Breakdown = { label: string; total: number; count: number; percentage: number };

function addBreakdown(workbook: ExcelJS.Workbook, name: string, items: Breakdown[], presentation: ReportPresentation) {
  const sheet = workbook.addWorksheet(name, { views: [{ showGridLines: false }] });
  const headerRow = titleRows(sheet, presentation, 4) + 1;
  sheet.addRow(['Nombre', 'Total', 'Movimientos', '% del gasto']);
  items.forEach((item) => sheet.addRow([
    safeSpreadsheetText(item.label), item.total, item.count, item.percentage,
  ]));
  styleTable(sheet, headerRow, 4, [2]);
  sheet.getColumn(1).width = 34;
  [2, 3, 4].forEach((column) => { sheet.getColumn(column).width = 18; });
  sheet.getColumn(3).numFmt = '#,##0';
  sheet.getColumn(4).numFmt = '0.0%';
  sheet.getColumn(4).eachCell((cell, row) => { if (row > headerRow && typeof cell.value === 'number') cell.value /= 100; });
}

function addMovements(workbook: ExcelJS.Workbook, rows: FinancialRow[], presentation: ReportPresentation) {
  const columns = rows[0] ? Object.keys(rows[0]) : ['Fecha', 'Comercio', 'Categoría', 'Tipo', 'Banco', 'Cuenta', 'Monto', 'Moneda', 'Estado'];
  const sheet = workbook.addWorksheet('Movimientos', { views: [{ showGridLines: false }] });
  const headerRow = titleRows(sheet, presentation, columns.length) + 1;
  sheet.addRow(columns);
  rows.forEach((row) => {
    const values = columns.map((column) => {
      const value = row[column as keyof FinancialRow] ?? '';
      if (column !== 'Fecha' || typeof value !== 'string') return value;
      const [day, month, year] = value.split('/').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12));
    });
    const added = sheet.addRow(values);
    if (String(row.Comercio).length > 28 || ('Notas' in row && row.Notas)) added.height = 38;
  });
  styleTable(sheet, headerRow, columns.length, [columns.indexOf('Monto') + 1]);
  sheet.getColumn(columns.indexOf('Fecha') + 1).numFmt = 'dd/mm/yyyy';
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column === 'Comercio' || column === 'Notas' ? 32 : column === 'Categoría' || column === 'Banco' ? 24 : 16;
  });
}

export async function renderXlsx(rows: FinancialRow[], summary: ReportSummary, presentation: ReportPresentation) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'bills.'; workbook.created = new Date();
  const selected = new Set(presentation.sections);
  if (selected.has('summary')) addSummary(workbook, summary, presentation);
  if (selected.has('comparison')) addComparison(workbook, summary, presentation);
  if (selected.has('categories')) addBreakdown(workbook, 'Categorías', summary.byCategory.map((item) => ({
    label: item.category, total: item.total, count: item.count, percentage: item.percentage,
  })), presentation);
  if (selected.has('merchants')) addBreakdown(workbook, 'Comercios', summary.byMerchant.map((item) => ({
    label: item.merchant, total: item.total, count: item.count,
    percentage: summary.totalAmount > 0 ? item.total / summary.totalAmount * 100 : 0,
  })), presentation);
  if (selected.has('movements')) addMovements(workbook, rows, presentation);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
