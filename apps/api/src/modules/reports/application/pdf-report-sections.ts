import type { ReportSummary } from './financial-report-data';
import { currencyValue, formatDelta, sortAndRankItems } from './financial-report-data';
import { ensureSpace, heading, PAGE, THEME } from './pdf-report.theme';

export function comparison(doc: PDFKit.PDFDocument, summary: ReportSummary, currency: string) {
  ensureSpace(doc, 90);
  heading(doc, 'Comparativa mensual (MoM)', 'Análisis de variaciones respecto al período anterior');

  const data = summary.comparison;
  if (!data) {
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(8.5)
      .text('El período seleccionado no tiene una comparación equivalente configurada.');
    return;
  }

  ensureSpace(doc, 68);
  const bannerY = doc.y;
  const bannerH = 56;
  doc.roundedRect(PAGE.left, bannerY, PAGE.contentWidth, bannerH, 6)
    .fillAndStroke(THEME.paper, THEME.line);

  doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.5)
    .text(`${data.currentPeriod.startDate} al ${data.currentPeriod.endDate} frente a ${data.previousPeriod.startDate} al ${data.previousPeriod.endDate}`, PAGE.left + 14, bannerY + 8);

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('GASTO PERÍODO ACTUAL', PAGE.left + 14, bannerY + 21);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(12)
    .text(currencyValue(data.currentPeriod.totalAmount, currency), PAGE.left + 14, bannerY + 33, { width: 140, ellipsis: true });

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('GASTO PERÍODO ANTERIOR', PAGE.left + 175, bannerY + 21);
  doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(12)
    .text(currencyValue(data.previousPeriod.totalAmount, currency), PAGE.left + 175, bannerY + 33, { width: 140, ellipsis: true });

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('VARIACIÓN NETA (MoM)', PAGE.left + 336, bannerY + 21);
  const isUp = data.expenseChangeAmount > 0;
  const isDown = data.expenseChangeAmount < 0;
  const varColor = isDown ? THEME.emerald : (isUp ? THEME.danger.text : THEME.slate);
  const deltaText = formatDelta(data.expenseChangeAmount, currency, data.expenseChangePercent);

  doc.fillColor(varColor).font('Helvetica-Bold').fontSize(12)
    .text(deltaText, PAGE.left + 336, bannerY + 33, { width: 165, ellipsis: true });

  doc.y = bannerY + bannerH + 12;

  if (data.categoryDeltas && data.categoryDeltas.length) {
    ensureSpace(doc, 65);
    doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(9)
      .text('Top variaciones por categoría', PAGE.left, doc.y);
    doc.moveDown(0.35);

    const headerY = doc.y;
    doc.rect(PAGE.left, headerY, PAGE.contentWidth, 20).fill(THEME.forest);
    doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(7);
    doc.text('CATEGORÍA', PAGE.left + 8, headerY + 6, { width: 140 });
    doc.text('ANTERIOR', PAGE.left + 152, headerY + 6, { width: 85, align: 'right' });
    doc.text('ACTUAL', PAGE.left + 242, headerY + 6, { width: 85, align: 'right' });
    doc.text('VARIACIÓN', PAGE.left + 332, headerY + 6, { width: 95, align: 'right' });
    doc.text('TENDENCIA', PAGE.left + 433, headerY + 6, { width: 70, align: 'center' });
    doc.y = headerY + 20;

    data.categoryDeltas.slice(0, 6).forEach((delta, index) => {
      ensureSpace(doc, 24);
      const rowY = doc.y;
      if (index % 2 === 1) {
        doc.rect(PAGE.left, rowY, PAGE.contentWidth, 22).fill(THEME.paper);
      }

      doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
        .text(delta.name, PAGE.left + 8, rowY + 6, { width: 140, ellipsis: true });
      doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.5)
        .text(currencyValue(delta.previousTotal, currency), PAGE.left + 152, rowY + 6, { width: 85, align: 'right' });
      doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
        .text(currencyValue(delta.currentTotal, currency), PAGE.left + 242, rowY + 6, { width: 85, align: 'right' });

      const dColor = delta.changeAmount < 0 ? THEME.emerald : (delta.changeAmount > 0 ? THEME.danger.text : THEME.slate);
      doc.fillColor(dColor).font('Helvetica-Bold').fontSize(7.5)
        .text(formatDelta(delta.changeAmount, currency, delta.changePercent), PAGE.left + 332, rowY + 6, { width: 95, align: 'right' });

      const isShiftUp = delta.changeAmount > 0;
      const isShiftDown = delta.changeAmount < 0;
      const pFill = isShiftUp ? THEME.danger.fill : (isShiftDown ? THEME.success.fill : THEME.paper);
      const pBorder = isShiftUp ? THEME.danger.border : (isShiftDown ? THEME.success.border : THEME.line);
      const pText = isShiftUp ? THEME.danger.text : (isShiftDown ? THEME.success.text : THEME.slate);
      const pLabel = isShiftUp ? '+ Mayor' : (isShiftDown ? '- Menor' : '= Igual');

      const pillX = PAGE.left + 436;
      const pillY = rowY + 3.5;
      doc.roundedRect(pillX, pillY, 64, 15, 7.5).fillAndStroke(pFill, pBorder);
      doc.fillColor(pText).font('Helvetica-Bold').fontSize(6.5)
        .text(pLabel, pillX, pillY + 3.5, { width: 64, align: 'center', lineBreak: false });

      doc.strokeColor(THEME.line).lineWidth(0.5)
        .moveTo(PAGE.left, rowY + 22).lineTo(PAGE.right, rowY + 22).stroke();
      doc.y = rowY + 22;
    });

    doc.y = doc.y + 10;
  }
}

export function renderSideBySideDistribution(
  doc: PDFKit.PDFDocument,
  summary: ReportSummary,
  currency: string,
) {
  ensureSpace(doc, 160);
  heading(doc, 'Distribución de gastos', 'Principales categorías y comercios en el período auditado');

  const startY = doc.y;
  const colW = (PAGE.contentWidth - 16) / 2;
  const leftX = PAGE.left;
  const rightX = PAGE.left + colW + 16;

  const categories = sortAndRankItems(
    summary.byCategory.map((item) => ({ label: item.category, total: item.total, count: item.count })),
    5,
  );

  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(8.5)
    .text('Top Categorías', leftX, startY);
  doc.strokeColor(THEME.line).lineWidth(0.5).moveTo(leftX, startY + 13).lineTo(leftX + colW, startY + 13).stroke();

  let catY = startY + 18;
  categories.forEach((item) => {
    const isTop1 = item.rankIndex === 1;
    const rankBg = isTop1 ? THEME.forest : (item.rankIndex <= 3 ? THEME.ink : THEME.slate);

    doc.roundedRect(leftX, catY + 1, 18, 13, 3).fill(rankBg);
    doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(6.5)
      .text(item.rank, leftX, catY + 3.5, { width: 18, align: 'center', lineBreak: false });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(item.label, leftX + 22, catY + 2, { width: 104, ellipsis: true });

    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7)
      .text(currencyValue(item.total, currency), leftX + 126, catY + 2, { width: 75, align: 'right' });
    doc.fillColor(THEME.emerald).font('Helvetica-Bold').fontSize(7)
      .text(`${item.sharePercent.toFixed(0)}%`, leftX + 204, catY + 2, { width: 40, align: 'right' });

    const bW = colW - 22;
    doc.roundedRect(leftX + 22, catY + 13, bW, 3.5, 1.75).fill('#e2e8f0');
    const fW = Math.max(4, bW * (item.sharePercent / 100));
    doc.roundedRect(leftX + 22, catY + 13, fW, 3.5, 1.75).fill(isTop1 ? THEME.emerald : '#047857');

    catY += 22;
  });

  const merchants = sortAndRankItems(
    summary.byMerchant.map((item) => ({ label: item.merchant || item.name, total: item.total, count: item.count })),
    5,
  );

  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(8.5)
    .text('Top Comercios', rightX, startY);
  doc.strokeColor(THEME.line).lineWidth(0.5).moveTo(rightX, startY + 13).lineTo(rightX + colW, startY + 13).stroke();

  let merchY = startY + 18;
  merchants.forEach((item) => {
    const isTop1 = item.rankIndex === 1;
    const rankBg = isTop1 ? THEME.forest : (item.rankIndex <= 3 ? THEME.ink : THEME.slate);

    doc.roundedRect(rightX, merchY + 1, 18, 13, 3).fill(rankBg);
    doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(6.5)
      .text(item.rank, rightX, merchY + 3.5, { width: 18, align: 'center', lineBreak: false });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(item.label, rightX + 22, merchY + 2, { width: 104, ellipsis: true });

    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7)
      .text(currencyValue(item.total, currency), rightX + 126, merchY + 2, { width: 75, align: 'right' });
    doc.fillColor(THEME.emerald).font('Helvetica-Bold').fontSize(7)
      .text(`${item.sharePercent.toFixed(0)}%`, rightX + 204, merchY + 2, { width: 40, align: 'right' });

    const bW = colW - 22;
    doc.roundedRect(rightX + 22, merchY + 13, bW, 3.5, 1.75).fill('#e2e8f0');
    const fW = Math.max(4, bW * (item.sharePercent / 100));
    doc.roundedRect(rightX + 22, merchY + 13, fW, 3.5, 1.75).fill(isTop1 ? THEME.emerald : '#047857');

    merchY += 22;
  });

  doc.y = Math.max(catY, merchY) + 12;
}

export function distribution(
  doc: PDFKit.PDFDocument,
  summary: ReportSummary,
  currency: string,
  type: 'categories' | 'merchants' = 'categories',
) {
  const isCat = type === 'categories';
  const title = isCat ? 'Top Categorías de Gasto' : 'Top Comercios e Interacciones';
  const subtitle = isCat ? 'Distribución de gasto por categoría' : 'Facturación consolidada por establecimiento';
  const rawItems = isCat
    ? summary.byCategory.map((i) => ({ label: i.category, total: i.total, count: i.count }))
    : summary.byMerchant.map((i) => ({ label: i.merchant || i.name, total: i.total, count: i.count }));

  ensureSpace(doc, 110);
  heading(doc, title, subtitle);

  if (!rawItems.length) {
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(8.5).text('No hay datos disponibles.');
    return;
  }

  const ranked = sortAndRankItems(rawItems, 6);
  ranked.forEach((item) => {
    ensureSpace(doc, 30);
    const itemY = doc.y;
    const isTop1 = item.rankIndex === 1;
    const rankBg = isTop1 ? THEME.forest : (item.rankIndex <= 3 ? THEME.ink : THEME.slate);

    doc.roundedRect(PAGE.left, itemY + 2, 22, 16, 4).fill(rankBg);
    doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(7.5)
      .text(item.rank, PAGE.left, itemY + 5.5, { width: 22, align: 'center', lineBreak: false });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(8)
      .text(item.label, PAGE.left + 28, itemY + 3, { width: 220, ellipsis: true });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(8.5)
      .text(currencyValue(item.total, currency), PAGE.right - 160, itemY + 2, { width: 95, align: 'right' });
    doc.fillColor(THEME.emerald).font('Helvetica-Bold').fontSize(8.5)
      .text(`${item.sharePercent.toFixed(1)}%`, PAGE.right - 55, itemY + 2, { width: 55, align: 'right' });

    const barX = PAGE.left + 28;
    const barW = PAGE.right - barX;
    const barY = itemY + 18;
    doc.roundedRect(barX, barY, barW, 4, 2).fill('#e2e8f0');
    const fillW = Math.max(5, barW * (item.sharePercent / 100));
    doc.roundedRect(barX, barY, fillW, 4, 2).fill(isTop1 ? THEME.emerald : '#047857');

    doc.y = itemY + 26;
  });
  doc.y += 6;
}
