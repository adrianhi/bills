export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 44,
  left: 44,
  right: 551.28,
  contentWidth: 507.28,
  bottom: 765,
};

export const THEME = {
  forest: '#064e3b',
  ink: '#0f172a',
  slate: '#64748b',
  line: '#e2e8f0',
  paper: '#f8fafc',
  white: '#ffffff',
  emerald: '#059669',
  mintSoft: '#ecfdf5',
  mintBorder: '#a7f3d0',
  danger: {
    fill: '#fef2f2',
    border: '#fca5a5',
    text: '#dc2626',
  },
  warning: {
    fill: '#fef3c7',
    border: '#fde68a',
    text: '#d97706',
  },
  success: {
    fill: '#ecfdf5',
    border: '#a7f3d0',
    text: '#059669',
  },
};

export function drawUpArrow(doc: PDFKit.PDFDocument, x: number, y: number, size = 6, color = '#dc2626') {
  doc.polygon([x, y + size], [x + size / 2, y], [x + size, y + size]).fill(color);
}

export function drawDownArrow(doc: PDFKit.PDFDocument, x: number, y: number, size = 6, color = '#059669') {
  doc.polygon([x, y], [x + size / 2, y + size], [x + size, y]).fill(color);
}

export function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > PAGE.bottom) {
    doc.addPage();
    doc.y = 44;
  }
}

export function heading(doc: PDFKit.PDFDocument, text: string, subtitle?: string) {
  ensureSpace(doc, subtitle ? 36 : 28);
  const y = doc.y;

  doc.roundedRect(PAGE.left, y + 2, 3, 14, 1.5).fill(THEME.emerald);
  doc.fillColor(THEME.forest).font('Helvetica-Bold').fontSize(12)
    .text(text, PAGE.left + 9, y);

  if (subtitle) {
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(7.5)
      .text(subtitle, PAGE.left + 9, y + 15);
    doc.y = y + 28;
  } else {
    doc.y = y + 19;
  }
}
