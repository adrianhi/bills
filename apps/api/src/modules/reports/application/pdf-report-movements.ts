import type { FinancialRow } from './financial-report-data';
import { currencyValue } from './financial-report-data';
import { PAGE, THEME } from './pdf-report.theme';

export function movementTableHeader(doc: PDFKit.PDFDocument, y: number, isContinuation = false) {
  if (isContinuation) {
    doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(10.5)
      .text('Detalle de movimientos (continuación)', PAGE.left, y - 16);
  }

  doc.rect(PAGE.left, y, PAGE.contentWidth, 22).fill(THEME.forest);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(7.2);
  doc.text('FECHA', PAGE.left + 6, y + 6.5, { width: 50 });
  doc.text('COMERCIO', PAGE.left + 60, y + 6.5, { width: 136 });
  doc.text('CATEGORÍA', PAGE.left + 200, y + 6.5, { width: 88 });
  doc.text('BANCO / TARJETA', PAGE.left + 292, y + 6.5, { width: 84 });
  doc.text('MONTO', PAGE.left + 380, y + 6.5, { width: 68, align: 'right' });
  doc.text('ESTADO', PAGE.left + 452, y + 6.5, { width: 50, align: 'center' });
  doc.y = y + 22;
}

export function movements(
  doc: PDFKit.PDFDocument,
  rows: FinancialRow[],
  includeNotes: boolean,
  currency = 'DOP',
) {
  doc.addPage();
  doc.x = PAGE.left;
  doc.y = 52;

  const totalSum = rows.reduce((acc, r) => acc + (Number(r.Monto) || 0), 0);

  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(14)
    .text('Detalle de movimientos', PAGE.left, 52);
  doc.fillColor(THEME.slate).font('Helvetica').fontSize(8)
    .text(`${rows.length.toLocaleString('es-DO')} movimientos incluidos   •   Suma total: ${currencyValue(totalSum, currency)}`, PAGE.left, 70);

  movementTableHeader(doc, 86);

  if (!rows.length) {
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(8.5)
      .text('No hay movimientos que coincidan con los filtros seleccionados.', PAGE.left, 120);
    return;
  }

  rows.forEach((row, index) => {
    const note = includeNotes && 'Notas' in row && row.Notas ? String(row.Notas).trim() : '';
    const rowH = note ? 38 : 24;

    if (doc.y + rowH > PAGE.bottom) {
      doc.addPage();
      doc.y = 54;
      movementTableHeader(doc, 54, true);
    }

    const rowY = doc.y;
    if (index % 2 === 1) {
      doc.rect(PAGE.left, rowY, PAGE.contentWidth, rowH).fill(THEME.paper);
    }

    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.2)
      .text(String(row.Fecha || ''), PAGE.left + 6, rowY + 6, { width: 50, lineBreak: false });

    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(String(row.Comercio || ''), PAGE.left + 60, rowY + 6, { width: 136, ellipsis: true });

    if (note) {
      doc.fillColor(THEME.slate).font('Helvetica-Oblique').fontSize(6.5)
        .text(`Nota: ${note}`, PAGE.left + 60, rowY + 20, { width: 136, ellipsis: true });
    }

    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.2)
      .text(String(row.Categoría || ''), PAGE.left + 200, rowY + 6, { width: 88, ellipsis: true });

    const bankStr = [row.Banco, row.Cuenta].filter(Boolean).join(' • ');
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.2)
      .text(bankStr, PAGE.left + 292, rowY + 6, { width: 84, ellipsis: true });

    const amtStr = `${row.Moneda} ${Number(row.Monto).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    doc.fillColor(THEME.ink).font('Helvetica-Bold').fontSize(7.5)
      .text(amtStr, PAGE.left + 380, rowY + 6, { width: 68, align: 'right', lineBreak: false });

    const st = String(row.Estado || '').toLowerCase();
    const isApp = st.includes('aprob') || st === 'approved';
    const isPen = st.includes('pend') || st === 'pending';
    const pFill = isApp ? THEME.success.fill : (isPen ? THEME.warning.fill : THEME.paper);
    const pBorder = isApp ? THEME.success.border : (isPen ? THEME.warning.border : THEME.line);
    const pColor = isApp ? THEME.success.text : (isPen ? THEME.warning.text : THEME.slate);

    const pillX = PAGE.left + 452;
    const pillY = rowY + 4;
    doc.roundedRect(pillX, pillY, 50, 14, 7).fillAndStroke(pFill, pBorder);
    doc.fillColor(pColor).font('Helvetica-Bold').fontSize(6.2)
      .text(String(row.Estado || ''), pillX, pillY + 3.5, { width: 50, align: 'center', lineBreak: false });

    doc.strokeColor(THEME.line).lineWidth(0.5)
      .moveTo(PAGE.left, rowY + rowH).lineTo(PAGE.right, rowY + rowH).stroke();

    doc.y = rowY + rowH;
  });

  // Closing Totals Card
  const endSpace = 55;
  if (doc.y + endSpace > PAGE.bottom) {
    doc.addPage();
    doc.y = 54;
  } else {
    doc.y += 14;
  }

  const cardY = doc.y;
  doc.roundedRect(PAGE.left, cardY, PAGE.contentWidth, 42, 6)
    .fillAndStroke(THEME.paper, THEME.line);

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('TOTAL DE MOVIMIENTOS', PAGE.left + 16, cardY + 9);
  doc.fillColor(THEME.ink).font('Helvetica').fontSize(9)
    .text(`${rows.length.toLocaleString('es-DO')} operaciones contabilizadas`, PAGE.left + 16, cardY + 22);

  doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
    .text('SUMA TOTAL FACTURADA', PAGE.right - 180, cardY + 9, { width: 164, align: 'right' });
  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(12)
    .text(currencyValue(totalSum, currency), PAGE.right - 180, cardY + 20, { width: 164, align: 'right' });

  doc.y = cardY + 54;
}
