import PDFDocument from 'pdfkit';
import type { FinancialRow, ReportBudget, ReportPresentation, ReportSummary } from './financial-report-data';
import { budgetStatusLabel, currencyValue } from './financial-report-data';

const COLORS = {
  dark: '#064e3b', green: '#059669', mint: '#d1fae5', ink: '#0f172a',
  muted: '#64748b', line: '#dbe4ea', paper: '#f8fafc', white: '#ffffff', amber: '#b45309',
};
const PAGE_BOTTOM = 755;

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > PAGE_BOTTOM) doc.addPage();
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 42);
  doc.moveDown(0.8).fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(13).text(text);
  doc.moveDown(0.3).strokeColor(COLORS.line).lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.55);
}

function cover(doc: PDFKit.PDFDocument, presentation: ReportPresentation) {
  doc.rect(0, 0, 595.28, 116).fill(COLORS.dark);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(23).text('bills.', 48, 32);
  doc.fontSize(19).text(presentation.title, 48, 66, { width: 499, ellipsis: true });
  doc.y = 136;
  presentation.metadata.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 48 + column * 255;
    const y = 136 + row * 34;
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text(item.label.toUpperCase(), x, y, { width: 235 });
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9).text(item.value, x, y + 11, { width: 235, ellipsis: true });
  });
  doc.y = 244;
}

function summaryCards(doc: PDFKit.PDFDocument, summary: ReportSummary, currency: string) {
  heading(doc, 'Resumen ejecutivo');
  const cards = [
    ['Gasto total', currencyValue(summary.totalAmount, currency)],
    ['Operaciones aprobadas', summary.approvedCount.toLocaleString('es-DO')],
    ['Promedio diario', currencyValue(summary.dailyAverage, currency)],
    ['Ticket promedio', currencyValue(summary.averageTicket || 0, currency)],
  ];
  const startY = doc.y;
  cards.forEach(([label, value], index) => {
    const x = 48 + (index % 2) * 255;
    const y = startY + Math.floor(index / 2) * 67;
    doc.roundedRect(x, y, 242, 55, 8).fill(index === 0 ? COLORS.dark : COLORS.paper);
    doc.fillColor(index === 0 ? COLORS.mint : COLORS.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 13, y + 11, { width: 215 });
    doc.fillColor(index === 0 ? COLORS.white : COLORS.ink).font('Helvetica-Bold').fontSize(14).text(value, x + 13, y + 28, { width: 215, ellipsis: true });
  });
  doc.y = startY + 129;
  if (summary.insights.length) {
    doc.moveDown(0.5);
    summary.insights.forEach((insight) => {
      ensureSpace(doc, 52);
      const y = doc.y;
      doc.roundedRect(48, y, 499, 43, 6).fillAndStroke('#fffbeb', '#fde68a');
      doc.fillColor(COLORS.amber).font('Helvetica-Bold').fontSize(9).text(insight.title, 60, y + 9, { width: 475 });
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(insight.description, 60, y + 23, { width: 475, ellipsis: true });
      doc.y = y + 47;
    });
  }
}

function comparison(doc: PDFKit.PDFDocument, summary: ReportSummary, currency: string) {
  heading(doc, 'Comparación con período anterior');
  const data = 'comparison' in summary ? summary.comparison : undefined;
  if (!data) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('El período seleccionado no tiene una comparación equivalente.');
    return;
  }
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5)
    .text(`${data.currentPeriod.startDate} al ${data.currentPeriod.endDate} frente a ${data.previousPeriod.startDate} al ${data.previousPeriod.endDate}.`);
  doc.moveDown(0.7);
  const values = [
    ['Actual', data.currentPeriod.totalAmount], ['Anterior', data.previousPeriod.totalAmount], ['Diferencia', data.expenseChangeAmount],
  ] as const;
  const y = doc.y;
  values.forEach(([label, value], index) => {
    const x = 48 + index * 166;
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x, y);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text(currencyValue(value, currency), x, y + 13, { width: 150 });
  });
  doc.y = y + 38;
}

function bars(doc: PDFKit.PDFDocument, title: string, items: Array<{ label: string; total: number }>, currency: string) {
  ensureSpace(doc, 85);
  heading(doc, title);
  if (!items.length) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('No hay datos para esta sección.');
    return;
  }
  const max = Math.max(...items.map((item) => item.total), 1);
  items.slice(0, 8).forEach((item) => {
    ensureSpace(doc, 35);
    const y = doc.y;
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5).text(item.label, 48, y, { width: 285, ellipsis: true });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text(currencyValue(item.total, currency), 387, y, { width: 160, align: 'right' });
    doc.roundedRect(48, y + 15, 499, 7, 3).fill('#e2e8f0');
    doc.roundedRect(48, y + 15, Math.max(6, 499 * item.total / max), 7, 3).fill(COLORS.green);
    doc.y = y + 30;
  });
}

function budgetSection(doc: PDFKit.PDFDocument, budget: ReportBudget, currency: string) {
  const contentHeight = budget?.hasBudget ? 112 + budget.categories.length * 27 : 70;
  ensureSpace(doc, Math.min(contentHeight, 330));
  heading(doc, 'Presupuesto del mes');
  if (!budget?.hasBudget) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('No hay un presupuesto configurado para este mes y moneda.');
    return;
  }
  if (budget.global) {
    ensureSpace(doc, 70);
    const item = budget.global; const y = doc.y;
    doc.roundedRect(48, y, 499, 58, 8).fill(COLORS.paper);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('LÍMITE GLOBAL', 61, y + 11);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(`${currencyValue(item.spent, currency)} de ${currencyValue(item.limit, currency)}`, 61, y + 27, { width: 330 });
    doc.fillColor(item.status === 'EXCEEDED' ? '#b91c1c' : COLORS.green).font('Helvetica-Bold').fontSize(8.5)
      .text(`${item.percentUsed.toFixed(1)}% - ${budgetStatusLabel(item.status)}`, 384, y + 29, { width: 146, align: 'right' });
    doc.y = y + 70;
  }
  budget.categories.forEach((item) => {
    ensureSpace(doc, 31); const y = doc.y;
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5).text(item.categoryLabel || 'Categoría', 48, y, { width: 200, ellipsis: true });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(`${currencyValue(item.spent, currency)} / ${currencyValue(item.limit, currency)}`, 250, y, { width: 170, align: 'right' });
    doc.fillColor(item.status === 'EXCEEDED' ? '#b91c1c' : COLORS.green).font('Helvetica-Bold')
      .text(`${item.percentUsed.toFixed(1)}% - ${budgetStatusLabel(item.status)}`, 427, y, { width: 120, align: 'right', ellipsis: true });
    doc.strokeColor(COLORS.line).moveTo(48, y + 20).lineTo(547, y + 20).stroke(); doc.y = y + 27;
  });
}

const movementColumns = [
  ['Fecha', 48, 57], ['Comercio', 105, 112], ['Categoría', 217, 98],
  ['Banco', 315, 91], ['Monto', 406, 78], ['Estado', 484, 63],
] as const;

function movementHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.rect(48, y, 499, 24).fill(COLORS.dark);
  movementColumns.forEach(([label, x, width]) => {
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(7.5).text(label, x + 5, y + 8, { width: width - 10 });
  });
  doc.y = y + 24;
}

function movements(doc: PDFKit.PDFDocument, rows: FinancialRow[], includeNotes: boolean) {
  doc.addPage();
  doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(16).text('Detalle de movimientos', 48, 48);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text(`${rows.length.toLocaleString('es-DO')} movimientos incluidos`, 48, 72);
  movementHeader(doc, 94);
  if (!rows.length) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('No hay movimientos que coincidan con los filtros.', 48, 132);
    return;
  }
  rows.forEach((row, index) => {
    const note = includeNotes && 'Notas' in row && row.Notas ? String(row.Notas) : '';
    const rowHeight = note ? 47 : 30;
    if (doc.y + rowHeight > PAGE_BOTTOM) {
      doc.addPage();
      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(12).text('Detalle de movimientos (continuación)', 48, 48);
      movementHeader(doc, 72);
    }
    const y = doc.y;
    if (index % 2 === 1) doc.rect(48, y, 499, rowHeight).fill(COLORS.paper);
    const values = [row.Fecha, row.Comercio, row.Categoría, row.Banco, `${row.Moneda} ${Number(row.Monto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, row.Estado];
    movementColumns.forEach(([, x, width], column) => {
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(7.2).text(String(values[column] ?? ''), x + 5, y + 7, { width: width - 10, height: 18, ellipsis: true });
    });
    if (note) doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(6.8).text(`Nota: ${note}`, 105, y + 27, { width: 432, height: 13, ellipsis: true });
    doc.strokeColor(COLORS.line).moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  });
}

function footers(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);
    doc.strokeColor(COLORS.line).moveTo(48, 773).lineTo(547, 773).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text('Generado bajo demanda por bills. - Analítica limitada a gastos visibles.', 48, 781, { width: 410, lineBreak: false });
    doc.text(`Página ${index + 1} de ${pages.count}`, 458, 781, { width: 89, align: 'right', lineBreak: false });
  }
}

export function renderPdf(rows: FinancialRow[], summary: ReportSummary, presentation: ReportPresentation, currency: string, includeNotes: boolean, budget: ReportBudget = null) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: presentation.title, Author: 'bills.' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk)); doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    cover(doc, presentation);
    const selected = new Set(presentation.sections);
    if (selected.has('summary')) summaryCards(doc, summary, currency);
    if (selected.has('comparison')) comparison(doc, summary, currency);
    if (selected.has('categories')) bars(doc, 'Principales categorías', summary.byCategory.map((item) => ({ label: item.category, total: item.total })), currency);
    if (selected.has('merchants')) bars(doc, 'Principales comercios', summary.byMerchant.map((item) => ({ label: item.merchant, total: item.total })), currency);
    if (selected.has('budget')) budgetSection(doc, budget, currency);
    if (selected.has('movements')) movements(doc, rows, includeNotes);
    footers(doc);
    doc.end();
  });
}
