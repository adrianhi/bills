import type { ReportBudget } from './financial-report-data';
import { budgetHealthSummary, categoryBudgetRows } from './financial-report-data';
import { ensureSpace, heading, PAGE, THEME } from './pdf-report.theme';

export function budgetSection(doc: PDFKit.PDFDocument, budget: ReportBudget, currency: string) {
  ensureSpace(doc, 110);
  heading(doc, 'Control presupuestario', 'Ejecución vs límite asignado por categoría y global');

  if (!budget?.hasBudget) {
    const emptyY = doc.y;
    doc.roundedRect(PAGE.left, emptyY, PAGE.contentWidth, 40, 6)
      .fillAndStroke(THEME.paper, THEME.line);
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(8.5)
      .text('No hay un presupuesto configurado para este mes y moneda.', PAGE.left + 16, emptyY + 15);
    doc.y = emptyY + 50;
    return;
  }

  const health = budgetHealthSummary(budget, currency);
  const catRows = categoryBudgetRows(budget, currency);

  // Hero Card with 3 Pillars
  ensureSpace(doc, 96);
  const heroY = doc.y;
  const heroH = 82;
  doc.roundedRect(PAGE.left, heroY, PAGE.contentWidth, heroH, 8)
    .fillAndStroke(THEME.paper, THEME.line);

  // Pillar 1: Presupuesto Asignado
  const p1X = PAGE.left + 16;
  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('PRESUPUESTO ASIGNADO', p1X, heroY + 11);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(13)
    .text(health ? health.formattedLimit : 'RD$ 0.00', p1X, heroY + 22, { width: 140, ellipsis: true });

  doc.strokeColor(THEME.line).lineWidth(0.5)
    .moveTo(PAGE.left + 166, heroY + 12).lineTo(PAGE.left + 166, heroY + 44).stroke();

  // Pillar 2: Gasto Real
  const p2X = PAGE.left + 180;
  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('GASTO REAL FACTURADO', p2X, heroY + 11);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(13)
    .text(health ? health.formattedSpent : 'RD$ 0.00', p2X, heroY + 22, { width: 140, ellipsis: true });

  doc.strokeColor(THEME.line).lineWidth(0.5)
    .moveTo(PAGE.left + 338, heroY + 12).lineTo(PAGE.left + 338, heroY + 44).stroke();

  // Pillar 3: Margen Neto
  const p3X = PAGE.left + 352;
  const isEx = health?.isExceeded ?? false;
  const marginLabel = isEx ? 'MARGEN NETO (EXCEDIDO)' : 'MARGEN NETO (DISPONIBLE)';
  const marginValue = isEx ? (health ? `-${health.formattedExcess}` : '') : (health ? `+${health.formattedAvailable}` : '');
  const marginColor = isEx ? THEME.danger.text : THEME.success.text;

  doc.fillColor(marginColor).font('Helvetica-Bold').fontSize(6.8)
    .text(marginLabel, p3X, heroY + 11);
  doc.fillColor(marginColor).font('Helvetica-Bold').fontSize(13)
    .text(marginValue, p3X, heroY + 22, { width: 145, ellipsis: true });

  // Global Progress Bar inside Hero Card
  const barY = heroY + 52;
  const barX = PAGE.left + 16;
  const barW = PAGE.contentWidth - 32;
  const barH = 7;
  doc.roundedRect(barX, barY, barW, barH, 3.5).fill('#e2e8f0');

  const pct = health ? health.percentUsed : 0;
  const barFillColor = pct > 100 ? THEME.danger.text : (pct >= 80 ? THEME.warning.text : THEME.emerald);
  const fillW = Math.max(6, Math.min(barW, barW * (pct / 100)));
  doc.roundedRect(barX, barY, fillW, barH, 3.5).fill(barFillColor);

  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8)
    .text(`${pct.toFixed(1)}% utilizado del límite global`, barX, barY + 11);

  if (health) {
    doc.fillColor(barFillColor).font('Helvetica-Bold').fontSize(6.8)
      .text(health.statusLabel.toUpperCase(), PAGE.right - 120, barY + 11, { width: 104, align: 'right' });
  }

  doc.y = heroY + heroH + 12;

  // Category Budget Breakdown Table
  ensureSpace(doc, 60);
  const tblHeaderY = doc.y;
  doc.rect(PAGE.left, tblHeaderY, PAGE.contentWidth, 20).fill(THEME.forest);

  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(7);
  doc.text('CATEGORÍA', PAGE.left + 8, tblHeaderY + 6, { width: 104 });
  doc.text('PRESUPUESTO', PAGE.left + 116, tblHeaderY + 6, { width: 74, align: 'right' });
  doc.text('GASTO REAL', PAGE.left + 194, tblHeaderY + 6, { width: 74, align: 'right' });
  doc.text('DISPONIBLE', PAGE.left + 272, tblHeaderY + 6, { width: 81, align: 'right' });
  doc.text('% CONSUMIDO', PAGE.left + 357, tblHeaderY + 6, { width: 70, align: 'center' });
  doc.text('ESTADO', PAGE.left + 431, tblHeaderY + 6, { width: 72, align: 'center' });
  doc.y = tblHeaderY + 20;

  catRows.forEach((row, index) => {
    ensureSpace(doc, 25);
    const rowY = doc.y;
    if (index % 2 === 1) {
      doc.rect(PAGE.left, rowY, PAGE.contentWidth, 24).fill(THEME.paper);
    }

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(row.categoryLabel, PAGE.left + 8, rowY + 7, { width: 104, ellipsis: true });

    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.5)
      .text(row.formattedLimit, PAGE.left + 116, rowY + 7, { width: 74, align: 'right' });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(row.formattedSpent, PAGE.left + 194, rowY + 7, { width: 74, align: 'right' });

    const catMargColor = row.isExceeded ? THEME.danger.text : THEME.success.text;
    const catSign = row.isExceeded ? '-' : '+';
    doc.fillColor(catMargColor).font('Helvetica-Bold').fontSize(7.5)
      .text(`${catSign}${row.formattedAvailableOrExcess}`, PAGE.left + 272, rowY + 7, { width: 81, align: 'right' });

    const microBarX = PAGE.left + 359;
    const microBarY = rowY + 10;
    const microBarW = 34;
    doc.roundedRect(microBarX, microBarY, microBarW, 4, 2).fill('#e2e8f0');
    const microFill = Math.max(3, Math.min(microBarW, microBarW * (row.percentUsed / 100)));
    const microColor = row.percentUsed > 100 ? THEME.danger.text : (row.percentUsed >= 80 ? THEME.warning.text : THEME.emerald);
    doc.roundedRect(microBarX, microBarY, microFill, 4, 2).fill(microColor);

    doc.fillColor('#475569').font('Helvetica').fontSize(7)
      .text(`${row.percentUsed.toFixed(0)}%`, microBarX + microBarW + 5, rowY + 7, { width: 30 });

    const pillTone = row.statusTone;
    const pFill = pillTone === 'danger' ? THEME.danger.fill : (pillTone === 'warning' ? THEME.warning.fill : THEME.success.fill);
    const pBorder = pillTone === 'danger' ? THEME.danger.border : (pillTone === 'warning' ? THEME.warning.border : THEME.success.border);
    const pText = pillTone === 'danger' ? THEME.danger.text : (pillTone === 'warning' ? THEME.warning.text : THEME.success.text);

    const pillX = PAGE.left + 435;
    const pillY = rowY + 4.5;
    doc.roundedRect(pillX, pillY, 64, 15, 7.5).fillAndStroke(pFill, pBorder);
    doc.fillColor(pText).font('Helvetica-Bold').fontSize(6.5)
      .text(row.statusLabel, pillX, pillY + 3.5, { width: 64, align: 'center', lineBreak: false });

    doc.strokeColor(THEME.line).lineWidth(0.5)
      .moveTo(PAGE.left, rowY + 24).lineTo(PAGE.right, rowY + 24).stroke();
    doc.y = rowY + 24;
  });

  // Total Summary Row
  ensureSpace(doc, 26);
  const sumY = doc.y;
  doc.rect(PAGE.left, sumY, PAGE.contentWidth, 24).fill('#f1f5f9');
  doc.strokeColor('#cbd5e1').lineWidth(1)
    .moveTo(PAGE.left, sumY).lineTo(PAGE.right, sumY).stroke();

  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
    .text('TOTAL PRESUPUESTADO', PAGE.left + 8, sumY + 7);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
    .text(health ? health.formattedLimit : '', PAGE.left + 116, sumY + 7, { width: 74, align: 'right' });
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
    .text(health ? health.formattedSpent : '', PAGE.left + 194, sumY + 7, { width: 74, align: 'right' });

  const totMargColor = health?.isExceeded ? THEME.danger.text : THEME.success.text;
  const totSign = health?.isExceeded ? '-' : '+';
  const totMargVal = health ? `${totSign}${health.isExceeded ? health.formattedExcess : health.formattedAvailable}` : '';
  doc.fillColor(totMargColor).font('Helvetica-Bold').fontSize(7.5)
    .text(totMargVal, PAGE.left + 272, sumY + 7, { width: 81, align: 'right' });

  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
    .text(`${health ? health.percentUsed.toFixed(0) : 0}%`, PAGE.left + 357, sumY + 7, { width: 70, align: 'center' });

  if (health) {
    const totTone = health.statusTone;
    const tpFill = totTone === 'danger' ? THEME.danger.fill : (totTone === 'warning' ? THEME.warning.fill : THEME.success.fill);
    const tpBorder = totTone === 'danger' ? THEME.danger.border : (totTone === 'warning' ? THEME.warning.border : THEME.success.border);
    const tpText = totTone === 'danger' ? THEME.danger.text : (totTone === 'warning' ? THEME.warning.text : THEME.success.text);

    const tpX = PAGE.left + 435;
    const tpY = sumY + 4.5;
    doc.roundedRect(tpX, tpY, 64, 15, 7.5).fillAndStroke(tpFill, tpBorder);
    doc.fillColor(tpText).font('Helvetica-Bold').fontSize(6.5)
      .text(health.statusLabel, tpX, tpY + 3.5, { width: 64, align: 'center', lineBreak: false });
  }

  doc.strokeColor(THEME.line).lineWidth(0.5)
    .moveTo(PAGE.left, sumY + 24).lineTo(PAGE.right, sumY + 24).stroke();
  doc.y = sumY + 34;
}
