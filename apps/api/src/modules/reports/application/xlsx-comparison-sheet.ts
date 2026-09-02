import type ExcelJS from 'exceljs';
import type { FinancialRow, ReportPresentation, ReportSummary } from './financial-report-data';
import { buildMonthlyCategoryMatrix, safeSpreadsheetText } from './financial-report-data';
import {
  BORDER,
  DARK,
  getColumnLetter,
  GREEN_FILL,
  GREEN_TEXT,
  MINT,
  RED_FILL,
  RED_TEXT,
  styleDataRow,
  styleTableHeader,
  titleRows,
} from './xlsx-report.styles';

export function addComparisonSheet(
  workbook: ExcelJS.Workbook,
  summary: ReportSummary,
  presentation: ReportPresentation,
  rows: FinancialRow[],
): void {
  const sheet = workbook.addWorksheet('Comparativa Mensual', { views: [{ state: 'frozen', ySplit: 12, showGridLines: false }] });
  titleRows(sheet, presentation, 6);

  sheet.addRow([]);

  const compTitle = sheet.addRow(['Resumen Comparativo de Períodos']);
  compTitle.getCell(1).font = { bold: true, color: { argb: DARK }, size: 12 };
  sheet.mergeCells(compTitle.number, 1, compTitle.number, 4);

  const headerRow = sheet.addRow(['Métrica', 'Período actual', 'Período anterior', 'Diferencia']);
  styleTableHeader(headerRow);

  const comparison = 'comparison' in summary ? summary.comparison : undefined;
  if (comparison) {
    const rowGasto = sheet.addRow([
      'Gasto',
      comparison.currentPeriod.totalAmount,
      comparison.previousPeriod.totalAmount,
      comparison.expenseChangeAmount,
    ]);
    [2, 3, 4].forEach((col) => { rowGasto.getCell(col).numFmt = '#,##0.00'; });
    styleDataRow(rowGasto, false);

    const rowProm = sheet.addRow([
      'Promedio diario',
      comparison.currentPeriod.dailyAverage,
      comparison.previousPeriod.dailyAverage,
      comparison.currentPeriod.dailyAverage - comparison.previousPeriod.dailyAverage,
    ]);
    [2, 3, 4].forEach((col) => { rowProm.getCell(col).numFmt = '#,##0.00'; });
    styleDataRow(rowProm, true);
  } else {
    const emptyRow = sheet.addRow(['Sin período comparable', '', '', '']);
    styleDataRow(emptyRow, false);
  }

  sheet.addRow([]);

  // Multi-Month Breakdown by Category (MoM Matrix)
  const matrix = buildMonthlyCategoryMatrix(rows, summary);
  const months = matrix.months;
  const M = months.length;

  const momTitle = sheet.addRow(['Desglose Mensual por Categoría (MoM)']);
  momTitle.getCell(1).font = { bold: true, color: { argb: DARK }, size: 12 };
  sheet.mergeCells(momTitle.number, 1, momTitle.number, 1 + M + 3);

  const momHeaders = ['Categoría', ...matrix.monthLabels, 'Total Acumulado', 'Promedio Mensual', 'Variación MoM'];
  const momHeaderRow = sheet.addRow(momHeaders);
  styleTableHeader(momHeaderRow);

  const startDataRow = 13;
  if (matrix.categories.length) {
    matrix.categories.forEach((cat, idx) => {
      const r = startDataRow + idx;
      const monthlyValues = months.map((m) => cat.monthlyAmounts[m] || 0);

      const lastColLetter = getColumnLetter(1 + M);

      let momCell: unknown = '-';
      if (M >= 2) {
        const prevCol = getColumnLetter(M);
        const currCol = getColumnLetter(1 + M);
        momCell = {
          formula: `IF(${prevCol}${r}>0, (${currCol}${r}-${prevCol}${r})/${prevCol}${r}, IF(${currCol}${r}>0, 1, 0))`,
          result: cat.momChangePercent ?? 0,
        };
      }

      const rowValues = [
        safeSpreadsheetText(cat.category),
        ...monthlyValues,
        { formula: `SUM(B${r}:${lastColLetter}${r})`, result: cat.total },
        { formula: `AVERAGE(B${r}:${lastColLetter}${r})`, result: cat.average },
        momCell,
      ];

      const row = sheet.addRow(rowValues);
      for (let c = 2; c <= 2 + M + 1; c += 1) {
        row.getCell(c).numFmt = '#,##0.00';
      }
      row.getCell(2 + M).font = { bold: true };
      row.getCell(3 + M).numFmt = '#,##0.00';

      if (M >= 2) {
        const momCellObj = row.getCell(4 + M);
        momCellObj.numFmt = '+0.0%;-0.0%;0.0%';
        if (cat.momChangePercent !== null && cat.momChangePercent > 0.001) {
          momCellObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } };
          momCellObj.font = { bold: true, color: { argb: RED_TEXT } };
        } else if (cat.momChangePercent !== null && cat.momChangePercent < -0.001) {
          momCellObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FILL } };
          momCellObj.font = { bold: true, color: { argb: GREEN_TEXT } };
        }
      }

      styleDataRow(row, idx % 2 === 1);
    });

    // Totals row for MoM table
    const totalRowIndex = startDataRow + matrix.categories.length;
    const totalColLetter = getColumnLetter(2 + M);

    const monthSumCells = months.map((_, mi) => {
      const colL = getColumnLetter(2 + mi);
      return {
        formula: `SUM(${colL}${startDataRow}:${colL}${totalRowIndex - 1})`,
        result: matrix.monthTotals[months[mi]] || 0,
      };
    });

    let momTotalCell: unknown = '-';
    if (M >= 2) {
      const prevCol = getColumnLetter(M);
      const currCol = getColumnLetter(1 + M);
      momTotalCell = {
        formula: `IF(${prevCol}${totalRowIndex}>0, (${currCol}${totalRowIndex}-${prevCol}${totalRowIndex})/${prevCol}${totalRowIndex}, 0)`,
        result: matrix.overallMomChangePercent ?? 0,
      };
    }

    const totalRow = sheet.addRow([
      'Total General',
      ...monthSumCells,
      { formula: `SUM(${totalColLetter}${startDataRow}:${totalColLetter}${totalRowIndex - 1})`, result: matrix.grandTotal },
      { formula: `AVERAGE(${totalColLetter}${startDataRow}:${totalColLetter}${totalRowIndex - 1})`, result: matrix.overallAverage },
      momTotalCell,
    ]);

    totalRow.height = 24;
    for (let c = 2; c <= 2 + M + 1; c += 1) {
      totalRow.getCell(c).numFmt = '#,##0.00';
    }
    if (M >= 2) {
      totalRow.getCell(4 + M).numFmt = '+0.0%;-0.0%;0.0%';
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
  } else {
    const emptyRow = sheet.addRow(['Sin movimientos para el período', ...months.map(() => 0), 0, 0, '-']);
    styleDataRow(emptyRow, false);
  }

  sheet.getColumn(1).width = 28;
  for (let c = 2; c <= 1 + M; c += 1) {
    sheet.getColumn(c).width = 18;
  }
  sheet.getColumn(2 + M).width = 20;
  sheet.getColumn(3 + M).width = 20;
  sheet.getColumn(4 + M).width = 18;
}
