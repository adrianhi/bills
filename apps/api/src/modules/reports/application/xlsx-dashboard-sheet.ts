import type ExcelJS from 'exceljs';
import type { FinancialRow, ReportBudget, ReportPresentation, ReportSummary } from './financial-report-data';
import { safeSpreadsheetText } from './financial-report-data';
import {
  AMBER_FILL,
  AMBER_TEXT,
  DARK,
  findMetadata,
  GREEN,
  GREEN_FILL,
  GREEN_TEXT,
  LIGHT,
  MINT,
  RED_FILL,
  RED_TEXT,
  setCardBorders,
  styleDataRow,
  styleTableHeader,
  titleRows,
} from './xlsx-report.styles';

export function addDashboardSheet(
  workbook: ExcelJS.Workbook,
  summary: ReportSummary,
  presentation: ReportPresentation,
  budget: ReportBudget,
  rows: FinancialRow[],
): void {
  const sheet = workbook.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  titleRows(sheet, presentation, 8);
  sheet.addRow([]);

  // Card 1: Gasto Total
  sheet.mergeCells(6, 1, 6, 2);
  const c1Title = sheet.getCell(6, 1);
  c1Title.value = 'GASTO TOTAL';
  c1Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c1Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 1, 7, 2);
  const c1Val = sheet.getCell(7, 1);
  const hasMovements = presentation.sections?.includes('movements') && rows.length > 0;
  c1Val.value = hasMovements
    ? { formula: `SUM(Movimientos!G7:G${6 + rows.length})`, result: summary.totalAmount }
    : summary.totalAmount;
  c1Val.font = { size: 16, bold: true, color: { argb: DARK } };
  c1Val.numFmt = '#,##0.00';
  c1Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 1, 8, 2);
  const c1Sub = sheet.getCell(8, 1);
  c1Sub.value = `${findMetadata(presentation, 'Moneda') || 'DOP'} · Total registrado`;
  c1Sub.font = { size: 9, color: { argb: 'FF64748B' } };
  c1Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 1; c <= 2; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MINT } };
    }
  }
  setCardBorders(sheet, 6, 8, 1, 2, 'FF6EE7B7');

  // Card 2: Presupuesto & Alerta
  sheet.mergeCells(6, 3, 6, 4);
  const c2Title = sheet.getCell(6, 3);
  c2Title.value = 'PRESUPUESTO';
  c2Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c2Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 3, 7, 4);
  const c2Val = sheet.getCell(7, 3);
  sheet.mergeCells(8, 3, 8, 4);
  const c2Sub = sheet.getCell(8, 3);

  let c2Bg = LIGHT;
  let c2Border = 'FFCBD5E1';
  if (budget?.hasBudget && budget.global) {
    const { spent, limit, percentUsed } = budget.global;
    c2Val.value = limit;
    c2Val.font = { size: 16, bold: true, color: { argb: DARK } };
    c2Val.numFmt = '#,##0.00';
    c2Val.alignment = { horizontal: 'center', vertical: 'middle' };

    const exceeded = spent > limit;
    if (exceeded) {
      const diff = spent - limit;
      c2Sub.value = `▲ Excedido por RD$ ${diff.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      c2Sub.font = { size: 9, bold: true, color: { argb: RED_TEXT } };
      c2Bg = RED_FILL;
      c2Border = 'FFF87171';
    } else if (percentUsed >= 80) {
      c2Sub.value = `Cerca del límite (${percentUsed.toFixed(0)}%)`;
      c2Sub.font = { size: 9, bold: true, color: { argb: AMBER_TEXT } };
      c2Bg = AMBER_FILL;
      c2Border = 'FFFCD34D';
    } else {
      c2Sub.value = `En ritmo (${percentUsed.toFixed(0)}% consumido)`;
      c2Sub.font = { size: 9, color: { argb: GREEN_TEXT } };
      c2Bg = GREEN_FILL;
      c2Border = 'FF86EFAC';
    }
  } else {
    c2Val.value = 'Sin presupuesto';
    c2Val.font = { size: 13, bold: true, color: { argb: 'FF64748B' } };
    c2Val.alignment = { horizontal: 'center', vertical: 'middle' };
    c2Sub.value = 'Control inactivo';
    c2Sub.font = { size: 9, color: { argb: 'FF94A3B8' } };
  }
  c2Sub.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let r = 6; r <= 8; r += 1) {
    for (let c = 3; c <= 4; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c2Bg } };
    }
  }
  setCardBorders(sheet, 6, 8, 3, 4, c2Border);

  // Card 3: Promedio Diario & Ticket
  sheet.mergeCells(6, 5, 6, 6);
  const c3Title = sheet.getCell(6, 5);
  c3Title.value = 'PROMEDIO DIARIO';
  c3Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c3Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 5, 7, 6);
  const c3Val = sheet.getCell(7, 5);
  c3Val.value = summary.dailyAverage;
  c3Val.font = { size: 16, bold: true, color: { argb: DARK } };
  c3Val.numFmt = '#,##0.00';
  c3Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 5, 8, 6);
  const c3Sub = sheet.getCell(8, 5);
  c3Sub.value = `Ticket Promedio: RD$ ${(summary.averageTicket || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  c3Sub.font = { size: 9, color: { argb: 'FF64748B' } };
  c3Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 5; c <= 6; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
  }
  setCardBorders(sheet, 6, 8, 5, 6);

  // Card 4: Operaciones
  sheet.mergeCells(6, 7, 6, 8);
  const c4Title = sheet.getCell(6, 7);
  c4Title.value = 'OPERACIONES';
  c4Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c4Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 7, 7, 8);
  const c4Val = sheet.getCell(7, 7);
  c4Val.value = summary.approvedCount;
  c4Val.font = { size: 16, bold: true, color: { argb: DARK } };
  c4Val.numFmt = '#,##0';
  c4Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 7, 8, 8);
  const c4Sub = sheet.getCell(8, 7);
  c4Sub.value = `${summary.totalTransactions} movimientos totales`;
  c4Sub.font = { size: 9, color: { argb: 'FF64748B' } };
  c4Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 7; c <= 8; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
  }
  setCardBorders(sheet, 6, 8, 7, 8);

  sheet.addRow([]);

  // Top 5 Categories
  const topHeaderRow = sheet.addRow(['Top 5 Categorías de Mayor Gasto']);
  topHeaderRow.getCell(1).font = { bold: true, color: { argb: DARK }, size: 12 };
  sheet.mergeCells(topHeaderRow.number, 1, topHeaderRow.number, 4);

  const catHeader = sheet.addRow(['Categoría', 'Gasto Total', '% del Total', 'Distribución Visual']);
  styleTableHeader(catHeader);

  const topCats = summary.byCategory.slice(0, 5);
  if (topCats.length) {
    topCats.forEach((cat, idx) => {
      const pct = summary.totalAmount > 0 ? cat.total / summary.totalAmount : 0;
      const barCount = Math.min(20, Math.max(1, Math.round(pct * 20)));
      const row = sheet.addRow([
        safeSpreadsheetText(cat.category),
        cat.total,
        { formula: `B${12 + idx}/$A$7`, result: pct },
        { formula: `REPT("■", ROUND(C${12 + idx}*20, 0))`, result: '■'.repeat(barCount) },
      ]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '0.0%';
      row.getCell(4).font = { bold: true, color: { argb: GREEN } };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      styleDataRow(row, idx % 2 === 1);
    });
  } else {
    const emptyRow = sheet.addRow(['Sin categorías registradas', 0, 0, '']);
    styleDataRow(emptyRow, false);
  }

  // Insights
  if (summary.insights.length) {
    sheet.addRow([]);
    const insightHeader = sheet.addRow(['Observaciones Financieras (Insights)']);
    insightHeader.getCell(1).font = { bold: true, color: { argb: DARK }, size: 12 };
    sheet.mergeCells(insightHeader.number, 1, insightHeader.number, 4);

    summary.insights.forEach((insight) => {
      const titleRow = sheet.addRow([`• ${safeSpreadsheetText(insight.title)}`]);
      sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);
      titleRow.getCell(1).font = { bold: true, color: { argb: DARK }, size: 10 };

      const descriptionRow = sheet.addRow([safeSpreadsheetText(insight.description)]);
      sheet.mergeCells(descriptionRow.number, 1, descriptionRow.number, 4);
      descriptionRow.getCell(1).font = { color: { argb: 'FF475569' }, italic: true, size: 9 };
      descriptionRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      descriptionRow.height = 26;
    });
  }

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 24;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 20;
  sheet.getColumn(8).width = 20;
}
