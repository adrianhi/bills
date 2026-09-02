import type ExcelJS from 'exceljs';
import type { ReportBudget, ReportPresentation } from './financial-report-data';
import { safeSpreadsheetText } from './financial-report-data';
import {
  AMBER_FILL,
  AMBER_TEXT,
  BORDER,
  CARD_BORDER,
  DARK,
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

export function addBudgetSheet(
  workbook: ExcelJS.Workbook,
  budget: ReportBudget,
  presentation: ReportPresentation,
): void {
  const sheet = workbook.addWorksheet('Presupuesto', { views: [{ state: 'frozen', ySplit: 11, showGridLines: false }] });
  titleRows(sheet, presentation, 8);

  const items = budget?.hasBudget ? [...(budget.global ? [budget.global] : []), ...budget.categories] : [];
  const globalItem = budget?.global;
  const totalLimit = globalItem ? globalItem.limit : items.reduce((s, i) => s + (i.limit || 0), 0);
  const totalSpent = globalItem ? globalItem.spent : items.reduce((s, i) => s + (i.spent || 0), 0);
  const totalPending = globalItem ? globalItem.pending : items.reduce((s, i) => s + (i.pending || 0), 0);
  const isExceeded = totalSpent > totalLimit;
  const netDiff = Math.abs(totalSpent - totalLimit);
  const globalPct = totalLimit > 0 ? totalSpent / totalLimit : 0;

  sheet.addRow([]);

  // 4 KPI Cards for Presupuesto (Rows 6-8)
  // Card 1: Presupuesto Asignado
  sheet.mergeCells(6, 1, 6, 2);
  const c1Title = sheet.getCell(6, 1);
  c1Title.value = 'PRESUPUESTO ASIGNADO';
  c1Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c1Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 1, 7, 2);
  const c1Val = sheet.getCell(7, 1);
  c1Val.value = totalLimit;
  c1Val.font = { size: 16, bold: true, color: { argb: DARK } };
  c1Val.numFmt = '#,##0.00';
  c1Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 1, 8, 2);
  const c1Sub = sheet.getCell(8, 1);
  c1Sub.value = 'Límite total asignado';
  c1Sub.font = { size: 9, color: { argb: 'FF64748B' } };
  c1Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 1; c <= 2; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
  }
  setCardBorders(sheet, 6, 8, 1, 2);

  // Card 2: Gasto Real
  sheet.mergeCells(6, 3, 6, 4);
  const c2Title = sheet.getCell(6, 3);
  c2Title.value = 'GASTO REAL';
  c2Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c2Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 3, 7, 4);
  const c2Val = sheet.getCell(7, 3);
  c2Val.value = totalSpent;
  c2Val.font = { size: 16, bold: true, color: { argb: DARK } };
  c2Val.numFmt = '#,##0.00';
  c2Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 3, 8, 4);
  const c2Sub = sheet.getCell(8, 3);
  c2Sub.value = totalPending > 0 ? `+ RD$ ${totalPending.toLocaleString('es-DO')} pendiente` : 'Gasto ejecutado';
  c2Sub.font = { size: 9, color: { argb: 'FF64748B' } };
  c2Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 3; c <= 4; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
  }
  setCardBorders(sheet, 6, 8, 3, 4);

  // Card 3: Margen Neto
  sheet.mergeCells(6, 5, 6, 6);
  const c3Title = sheet.getCell(6, 5);
  c3Title.value = 'MARGEN NETO';
  c3Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c3Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 5, 7, 6);
  const c3Val = sheet.getCell(7, 5);
  c3Val.value = isExceeded
    ? `▲ Excedido por RD$ ${netDiff.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
    : `Disponible RD$ ${netDiff.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  c3Val.font = { size: 12, bold: true, color: { argb: isExceeded ? RED_TEXT : GREEN_TEXT } };
  c3Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 5, 8, 6);
  const c3Sub = sheet.getCell(8, 5);
  c3Sub.value = isExceeded ? 'Límite sobrepasado' : 'Dentro del margen';
  c3Sub.font = { size: 9, color: { argb: isExceeded ? RED_TEXT : GREEN_TEXT } };
  c3Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let r = 6; r <= 8; r += 1) {
    for (let c = 5; c <= 6; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isExceeded ? RED_FILL : GREEN_FILL } };
    }
  }
  setCardBorders(sheet, 6, 8, 5, 6, isExceeded ? 'FFF87171' : 'FF86EFAC');

  // Card 4: % Consumido
  sheet.mergeCells(6, 7, 6, 8);
  const c4Title = sheet.getCell(6, 7);
  c4Title.value = '% CONSUMIDO';
  c4Title.font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
  c4Title.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(7, 7, 7, 8);
  const c4Val = sheet.getCell(7, 7);
  c4Val.value = `${(globalPct * 100).toFixed(1)}%`;
  c4Val.font = { size: 16, bold: true, color: { argb: isExceeded ? RED_TEXT : (globalPct >= 0.8 ? AMBER_TEXT : GREEN_TEXT) } };
  c4Val.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(8, 7, 8, 8);
  const c4Sub = sheet.getCell(8, 7);
  c4Sub.value = isExceeded ? 'Estado: Excedido' : (globalPct >= 0.8 ? 'Estado: Cerca del límite' : 'Estado: En ritmo');
  c4Sub.font = { size: 9, color: { argb: isExceeded ? RED_TEXT : (globalPct >= 0.8 ? AMBER_TEXT : GREEN_TEXT) } };
  c4Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  const c4Bg = isExceeded ? RED_FILL : (globalPct >= 0.8 ? AMBER_FILL : GREEN_FILL);
  for (let r = 6; r <= 8; r += 1) {
    for (let c = 7; c <= 8; c += 1) {
      sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c4Bg } };
    }
  }
  setCardBorders(sheet, 6, 8, 7, 8, isExceeded ? 'FFF87171' : (globalPct >= 0.8 ? 'FFFCD34D' : 'FF86EFAC'));

  sheet.addRow([]);

  const sectionHeader = sheet.addRow(['Detalle de Presupuesto por Categoría']);
  sectionHeader.getCell(1).font = { bold: true, color: { argb: DARK }, size: 12 };
  sheet.mergeCells(sectionHeader.number, 1, sectionHeader.number, 8);

  const headerRow = sheet.addRow(['Objetivo', 'Límite', 'Aprobado', 'Pendiente', 'Restante', 'Exceso', '% consumido', 'Estado']);
  styleTableHeader(headerRow);

  if (!items.length) {
    const emptyRow = sheet.addRow(['Sin presupuesto configurado', '', '', '', '', '', '', '']);
    styleDataRow(emptyRow, false);
  } else {
    items.forEach((item, index) => {
      const rowNumber = 12 + index;
      const percentRatio = item.percentUsed / 100;
      const exceeded = item.percentUsed > 100 || item.spent > item.limit;
      const nearLimit = !exceeded && item.percentUsed >= 80;

      let statusLabelText = 'En ritmo';
      if (exceeded) {
        const excess = item.exceededBy || (item.spent - item.limit);
        statusLabelText = `▲ Excedido por RD$ ${excess.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      } else if (nearLimit) {
        statusLabelText = 'Cerca del límite';
      }

      const row = sheet.addRow([
        safeSpreadsheetText(item.categoryLabel || 'Presupuesto global'),
        item.limit,
        item.spent,
        item.pending,
        { formula: `MAX(0, B${rowNumber}-C${rowNumber})`, result: item.remaining },
        { formula: `MAX(0, C${rowNumber}-B${rowNumber})`, result: item.exceededBy },
        { formula: `IF(B${rowNumber}>0, C${rowNumber}/B${rowNumber}, 0)`, result: percentRatio },
        statusLabelText,
      ]);

      [2, 3, 4, 5, 6].forEach((col) => { row.getCell(col).numFmt = '#,##0.00'; });
      row.getCell(7).numFmt = '0.0%';

      if (exceeded) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } };
          cell.font = { bold: true, color: { argb: RED_TEXT } };
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFF87171' } } };
        });
      } else if (nearLimit) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_FILL } };
          cell.font = { bold: true, color: { argb: AMBER_TEXT } };
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFFCD34D' } } };
        });
      } else {
        styleDataRow(row, index % 2 === 1);
        row.getCell(8).font = { color: { argb: GREEN_TEXT } };
      }
    });

    const totalRowIndex = 12 + items.length;
    const totalRow = sheet.addRow([
      'Total',
      { formula: `SUM(B12:B${totalRowIndex - 1})`, result: totalLimit },
      { formula: `SUM(C12:C${totalRowIndex - 1})`, result: totalSpent },
      { formula: `SUM(D12:D${totalRowIndex - 1})`, result: totalPending },
      { formula: `MAX(0, B${totalRowIndex}-C${totalRowIndex})`, result: Math.max(0, totalLimit - totalSpent) },
      { formula: `MAX(0, C${totalRowIndex}-B${totalRowIndex})`, result: Math.max(0, totalSpent - totalLimit) },
      { formula: `IF(B${totalRowIndex}>0, C${totalRowIndex}/B${totalRowIndex}, 0)`, result: globalPct },
      isExceeded ? '▲ Excedido' : (globalPct >= 0.8 ? 'Cerca del límite' : 'En ritmo'),
    ]);

    totalRow.height = 24;
    [2, 3, 4, 5, 6].forEach((col) => { totalRow.getCell(col).numFmt = '#,##0.00'; });
    totalRow.getCell(7).numFmt = '0.0%';

    totalRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: isExceeded ? RED_TEXT : DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isExceeded ? RED_FILL : MINT } };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'double', color: { argb: DARK } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  }

  sheet.getColumn(1).width = 30;
  [2, 3, 4, 5, 6].forEach((col) => { sheet.getColumn(col).width = 18; });
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 28;
  sheet.autoFilter = { from: { row: 11, column: 1 }, to: { row: 11 + items.length, column: 8 } };
}
