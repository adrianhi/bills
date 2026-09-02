import type { ReportBudget, ReportPresentation, ReportSummary } from './financial-report-data';
import { budgetHealthSummary, currencyValue, formatDelta } from './financial-report-data';
import { drawDownArrow, drawUpArrow, ensureSpace, heading, PAGE, THEME } from './pdf-report.theme';

export function cover(doc: PDFKit.PDFDocument, presentation: ReportPresentation) {
  const getMeta = (prefix: string) =>
    presentation.metadata.find((m) => m.label.toLowerCase().includes(prefix))?.value || '';

  const period = getMeta('período') || getMeta('periodo') || 'Período Completo';
  const currency = getMeta('moneda') || 'DOP';
  const banks = getMeta('banco') || 'Todos los bancos';
  const filters = getMeta('filtro') || 'Sin filtros adicionales';
  const comparedWith = getMeta('comparad') || 'No disponible';
  const generated = getMeta('generad') || '';

  doc.font('Helvetica-Bold').fontSize(22);
  const billsWidth = doc.widthOfString('bills');
  doc.fillColor(THEME.forest).text('bills', PAGE.left, 44, { lineBreak: false });
  doc.circle(PAGE.left + billsWidth + 3.5, 44 + 16.5, 2.8).fill(THEME.emerald);

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(7.5)
    .text('INFORME FINANCIERO EJECUTIVO', PAGE.left, 72, { lineBreak: false });

  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(13)
    .text(presentation.title, PAGE.left, 85, { width: 315, ellipsis: true });

  const badgeX = 368;
  const badgeY = 44;
  const badgeW = PAGE.right - badgeX;
  const badgeH = 52;
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fillAndStroke(THEME.mintSoft, THEME.mintBorder);

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('PERÍODO ANALIZADO', badgeX + 12, badgeY + 10, { lineBreak: false });
  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(10.5)
    .text(period, badgeX + 12, badgeY + 22, { width: 110, ellipsis: true });

  const pillW = 44;
  const pillH = 20;
  const pillX = badgeX + badgeW - pillW - 10;
  const pillY = badgeY + 16;
  doc.roundedRect(pillX, pillY, pillW, pillH, 4).fill(THEME.forest);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(8)
    .text(currency, pillX, pillY + 5.5, { width: pillW, align: 'center', lineBreak: false });

  const ribbonY = 114;
  const ribbonH = 46;
  doc.roundedRect(PAGE.left, ribbonY, PAGE.contentWidth, ribbonH, 6)
    .fillAndStroke(THEME.paper, THEME.line);

  const metaItems = [
    { label: 'BANCOS AUDITADOS', val: banks },
    { label: 'FILTROS APLICADOS', val: filters },
    { label: 'COMPARADO CON', val: comparedWith },
    { label: 'FECHA DE EMISIÓN', val: generated },
  ];

  const colWidth = PAGE.contentWidth / 4;
  metaItems.forEach((item, i) => {
    const x = PAGE.left + i * colWidth + 10;
    doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.5)
      .text(item.label, x, ribbonY + 8, { width: colWidth - 14, lineBreak: false });
    doc.fillColor(THEME.ink).font('Helvetica').fontSize(8)
      .text(item.val, x, ribbonY + 21, { width: colWidth - 14, ellipsis: true });
  });

  doc.y = ribbonY + ribbonH + 16;
}

export function summaryCards(
  doc: PDFKit.PDFDocument,
  summary: ReportSummary,
  currency: string,
  budget: ReportBudget,
) {
  heading(doc, 'Resumen ejecutivo', 'Indicadores clave de desempeño financiero en el período');

  const cardW = (PAGE.contentWidth - 11.28) / 2;
  const cardH = 68;
  const x1 = PAGE.left;
  const x2 = PAGE.left + cardW + 11.28;
  const y1 = doc.y;
  const y2 = y1 + cardH + 10;

  // CARD 1: GASTO TOTAL
  doc.roundedRect(x1, y1, cardW, cardH, 8).fill(THEME.forest);
  doc.fillColor('#a7f3d0').font('Helvetica-Bold').fontSize(7.2)
    .text('GASTO TOTAL FACTURADO', x1 + 14, y1 + 9);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(16)
    .text(currencyValue(summary.totalAmount, currency), x1 + 14, y1 + 22, { width: 220, ellipsis: true });

  const momPct = summary.comparison?.expenseChangePercent;
  const momAmt = summary.comparison?.expenseChangeAmount;
  const yBadge = y1 + 45;

  if (typeof momPct === 'number') {
    const isIncrease = momPct > 0;
    const isDecrease = momPct < 0;
    const arrowColor = isIncrease ? '#fca5a5' : '#86efac';
    const textColor = isIncrease ? '#fca5a5' : '#86efac';
    const sign = isIncrease ? '+' : '';
    const pillText = `${sign}${momPct.toFixed(1)}% vs período ant.`;

    doc.roundedRect(x1 + 14, yBadge, 148, 14, 3).fill('#043d2e');
    if (isIncrease) drawUpArrow(doc, x1 + 20, yBadge + 4, 6, arrowColor);
    else if (isDecrease) drawDownArrow(doc, x1 + 20, yBadge + 4, 6, arrowColor);
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(7)
      .text(pillText, x1 + 29, yBadge + 3.5, { width: 128, lineBreak: false });
  } else if (typeof momAmt === 'number') {
    const deltaStr = formatDelta(momAmt, currency, null);
    doc.roundedRect(x1 + 14, yBadge, 155, 14, 3).fill('#043d2e');
    doc.fillColor('#a7f3d0').font('Helvetica-Bold').fontSize(6.8)
      .text(`${deltaStr} vs anterior`, x1 + 18, yBadge + 3.5, { width: 147, lineBreak: false });
  } else {
    doc.roundedRect(x1 + 14, yBadge, 105, 14, 3).fill('#043d2e');
    doc.fillColor('#a7f3d0').font('Helvetica-Bold').fontSize(7)
      .text('Período auditado', x1 + 14, yBadge + 3.5, { width: 105, align: 'center', lineBreak: false });
  }

  // CARD 2: CONTROL DE PRESUPUESTO
  const health = budgetHealthSummary(budget, currency);
  if (health) {
    const isEx = health.isExceeded;
    const boxFill = isEx ? THEME.danger.fill : THEME.success.fill;
    const boxBorder = isEx ? THEME.danger.border : THEME.success.border;
    const boxText = isEx ? THEME.danger.text : THEME.success.text;
    const pillFill = isEx ? '#fee2e2' : '#d1fae5';
    const pillText = isEx ? THEME.danger.text : '#065f46';
    const titleVal = isEx ? `Excedido por ${health.formattedExcess}` : `Disponible ${health.formattedAvailable}`;

    doc.roundedRect(x2, y1, cardW, cardH, 8).fillAndStroke(boxFill, boxBorder);
    doc.fillColor(boxText).font('Helvetica-Bold').fontSize(7.2)
      .text('CONTROL DE PRESUPUESTO', x2 + 14, y1 + 9);

    doc.roundedRect(x2 + 168, y1 + 7, 66, 13, 3).fill(pillFill);
    doc.fillColor(pillText).font('Helvetica-Bold').fontSize(6.2)
      .text(health.statusLabel.toUpperCase(), x2 + 168, y1 + 10, { width: 66, align: 'center', lineBreak: false });

    doc.fillColor(boxText).font('Helvetica-Bold').fontSize(13)
      .text(titleVal, x2 + 14, y1 + 24, { width: 220, ellipsis: true });
    doc.fillColor(isEx ? '#991b1b' : THEME.forest).font('Helvetica').fontSize(7.2)
      .text(`${health.percentUsed.toFixed(1)}% consumido • Límite: ${health.formattedLimit}`, x2 + 14, y1 + 47, { width: 220, ellipsis: true });
  } else {
    doc.roundedRect(x2, y1, cardW, cardH, 8).fillAndStroke(THEME.paper, THEME.line);
    doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(7.2)
      .text('PROMEDIO DIARIO DE GASTO', x2 + 14, y1 + 9);
    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(15)
      .text(currencyValue(summary.dailyAverage, currency), x2 + 14, y1 + 23, { width: 220, ellipsis: true });

    const daysText = summary.comparison?.currentPeriod?.days
      ? `${summary.comparison.currentPeriod.days} días en el período analizado`
      : 'Gasto estimado por jornada';
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.2)
      .text(daysText, x2 + 14, y1 + 47, { width: 220, ellipsis: true });
  }

  // CARD 3: TICKET PROMEDIO Y FRECUENCIA
  doc.roundedRect(x1, y2, cardW, cardH, 8).fillAndStroke(THEME.paper, THEME.line);
  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(7.2)
    .text('MÉTRICAS DE TICKET Y FRECUENCIA', x1 + 14, y2 + 9);
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8).text('Ticket Promedio', x1 + 14, y2 + 23);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(12.5)
    .text(currencyValue(summary.averageTicket || 0, currency), x1 + 14, y2 + 35, { width: 102, ellipsis: true });
  doc.strokeColor(THEME.line).lineWidth(0.5).moveTo(x1 + 124, y2 + 23).lineTo(x1 + 124, y2 + 56).stroke();
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8).text('Promedio Diario', x1 + 134, y2 + 23);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(12.5)
    .text(currencyValue(summary.dailyAverage, currency), x1 + 134, y2 + 35, { width: 102, ellipsis: true });

  // CARD 4: VOLUMEN DE OPERACIONES
  doc.roundedRect(x2, y2, cardW, cardH, 8).fillAndStroke(THEME.paper, THEME.line);
  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(7.2)
    .text('VOLUMEN DE OPERACIONES', x2 + 14, y2 + 9);
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8).text('Transacciones', x2 + 14, y2 + 23);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(14)
    .text(summary.approvedCount.toLocaleString('es-DO'), x2 + 14, y2 + 34);
  doc.fillColor(THEME.emerald).font('Helvetica-Bold').fontSize(6.5)
    .text('aprobadas', x2 + 14, y2 + 51);
  doc.strokeColor(THEME.line).lineWidth(0.5).moveTo(x2 + 124, y2 + 23).lineTo(x2 + 124, y2 + 56).stroke();
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8).text('Comercios Únicos', x2 + 134, y2 + 23);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(14)
    .text((summary.byMerchant?.length || 0).toLocaleString('es-DO'), x2 + 134, y2 + 34);
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.5)
    .text('interactuados', x2 + 134, y2 + 51);

  doc.x = PAGE.left;
  doc.y = y2 + cardH + 12;
}

export function insights(doc: PDFKit.PDFDocument, summary: ReportSummary) {
  if (!summary.insights || !summary.insights.length) return;

  summary.insights.forEach((insight) => {
    ensureSpace(doc, 48);
    const y = doc.y;
    const tone = insight.tone?.toLowerCase() || '';
    const isWarn = tone === 'warning' || tone === 'danger' || tone === 'alert';
    const isSucc = tone === 'success' || tone === 'positive';

    const fill = isWarn ? THEME.warning.fill : (isSucc ? THEME.success.fill : THEME.paper);
    const border = isWarn ? THEME.warning.border : (isSucc ? THEME.success.border : THEME.line);
    const bar = isWarn ? THEME.warning.text : (isSucc ? THEME.success.text : THEME.emerald);
    const titleColor = isWarn ? '#92400e' : (isSucc ? '#065f46' : THEME.ink);

    doc.roundedRect(PAGE.left, y, PAGE.contentWidth, 38, 5).fillAndStroke(fill, border);
    doc.roundedRect(PAGE.left, y, 4, 38, 2).fill(bar);

    doc.fillColor(titleColor).font('Helvetica-Bold').fontSize(8.5)
      .text(insight.title, PAGE.left + 14, y + 8, { width: PAGE.contentWidth - 28 });
    doc.fillColor('#334155').font('Helvetica').fontSize(7.5)
      .text(insight.description, PAGE.left + 14, y + 21, { width: PAGE.contentWidth - 28, ellipsis: true });

    doc.y = y + 44;
  });
}
