import type ExcelJS from 'exceljs';
import type { ReportPresentation } from './financial-report-data';
import { safeSpreadsheetText } from './financial-report-data';

export const GREEN = 'FF047857';
export const DARK = 'FF064E3B';
export const MINT = 'FFF0FDF4';
export const LIGHT = 'FFF8FAFC';
export const BORDER = 'FFE2E8F0';
export const CARD_BORDER = 'FFCBD5E1';

export const RED_FILL = 'FFFEE2E2';
export const RED_TEXT = 'FF991B1B';
export const AMBER_FILL = 'FFFEF3C7';
export const AMBER_TEXT = 'FF92400E';
export const GREEN_FILL = 'FFDCFCE7';
export const GREEN_TEXT = 'FF166534';

export function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

export function findMetadata(presentation: ReportPresentation, label: string): string {
  const item = presentation.metadata.find((m) => m.label.toLowerCase() === label.toLowerCase());
  return item ? item.value : '';
}

export function titleRows(sheet: ExcelJS.Worksheet, presentation: ReportPresentation, columns: number): number {
  const maxCol = Math.max(4, columns);
  sheet.mergeCells(1, 1, 1, maxCol);
  const title = sheet.getCell(1, 1);
  title.value = presentation.title;
  title.font = { size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  title.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 32;

  const row2 = sheet.getRow(2);
  row2.height = 20;
  row2.getCell(1).value = 'Período:';
  row2.getCell(1).font = { bold: true, color: { argb: DARK }, size: 9 };
  row2.getCell(2).value = safeSpreadsheetText(findMetadata(presentation, 'Período'));
  row2.getCell(2).font = { color: { argb: 'FF334155' }, size: 9 };
  row2.getCell(3).value = 'Moneda:';
  row2.getCell(3).font = { bold: true, color: { argb: DARK }, size: 9 };
  row2.getCell(4).value = safeSpreadsheetText(findMetadata(presentation, 'Moneda'));
  row2.getCell(4).font = { color: { argb: 'FF334155' }, size: 9 };

  const row3 = sheet.getRow(3);
  row3.height = 20;
  row3.getCell(1).value = 'Comparado con:';
  row3.getCell(1).font = { bold: true, color: { argb: DARK }, size: 9 };
  row3.getCell(2).value = safeSpreadsheetText(findMetadata(presentation, 'Comparado con'));
  row3.getCell(2).font = { color: { argb: 'FF334155' }, size: 9 };
  row3.getCell(3).value = 'Generado:';
  row3.getCell(3).font = { bold: true, color: { argb: DARK }, size: 9 };
  row3.getCell(4).value = safeSpreadsheetText(findMetadata(presentation, 'Generado'));
  row3.getCell(4).font = { color: { argb: 'FF334155' }, size: 9 };

  const row4 = sheet.getRow(4);
  row4.height = 20;
  row4.getCell(1).value = 'Bancos:';
  row4.getCell(1).font = { bold: true, color: { argb: DARK }, size: 9 };
  row4.getCell(2).value = safeSpreadsheetText(findMetadata(presentation, 'Bancos'));
  row4.getCell(2).font = { color: { argb: 'FF334155' }, size: 9 };
  row4.getCell(3).value = 'Filtros:';
  row4.getCell(3).font = { bold: true, color: { argb: DARK }, size: 9 };
  row4.getCell(4).value = safeSpreadsheetText(findMetadata(presentation, 'Filtros'));
  row4.getCell(4).font = { color: { argb: 'FF334155' }, size: 9 };

  [row2, row3, row4].forEach((row) => {
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return 4;
}

export function styleTableHeader(row: ExcelJS.Row, bg = GREEN) {
  row.height = 25;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: DARK } },
      bottom: { style: 'medium', color: { argb: DARK } },
      left: { style: 'thin', color: { argb: '33FFFFFF' } },
      right: { style: 'thin', color: { argb: '33FFFFFF' } },
    };
  });
}

export function styleDataRow(row: ExcelJS.Row, isEven: boolean, height = 22) {
  row.height = height;
  row.eachCell((cell) => {
    if (!cell.fill || cell.fill.type !== 'pattern') {
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
      }
    }
    cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
    if (!cell.alignment) {
      cell.alignment = { vertical: 'middle', wrapText: true };
    }
  });
}

export function setCardBorders(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number, borderColor = CARD_BORDER) {
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = startCol; c <= endCol; c += 1) {
      const cell = sheet.getCell(r, c);
      const border = { ...cell.border };
      if (r === startRow) border.top = { style: 'thin', color: { argb: borderColor } };
      if (r === endRow) border.bottom = { style: 'thin', color: { argb: borderColor } };
      if (c === startCol) border.left = { style: 'thin', color: { argb: borderColor } };
      if (c === endCol) border.right = { style: 'thin', color: { argb: borderColor } };
      cell.border = border;
    }
  }
}
