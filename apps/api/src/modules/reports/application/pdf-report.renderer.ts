import PDFDocument from 'pdfkit';
import type { FinancialRow, ReportBudget, ReportPresentation, ReportSummary } from './financial-report-data';
import { PAGE, THEME } from './pdf-report.theme';
import { cover, insights, summaryCards } from './pdf-report-cover';
import { budgetSection } from './pdf-report-budget';
import { comparison, distribution, renderSideBySideDistribution } from './pdf-report-sections';
import { movements } from './pdf-report-movements';

function footersAndHeaders(doc: PDFKit.PDFDocument, presentation: ReportPresentation) {
  const pages = doc.bufferedPageRange();
  const getMeta = (prefix: string) =>
    presentation.metadata.find((m) => m.label.toLowerCase().includes(prefix))?.value || '';
  const period = getMeta('período') || getMeta('periodo') || '';

  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);

    if (index > 0) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      const billsW = doc.widthOfString('bills');
      doc.fillColor(THEME.forest).text('bills', PAGE.left, 24, { lineBreak: false });
      doc.circle(PAGE.left + billsW + 2, 24 + 6.5, 1.8).fill(THEME.emerald);

      const headerText = period ? `Informe financiero  •  ${period}` : presentation.title;
      doc.fillColor(THEME.slate).font('Helvetica').fontSize(7)
        .text(headerText, PAGE.left + billsW + 12, 24.5, { lineBreak: false });

      doc.strokeColor(THEME.line).lineWidth(0.5)
        .moveTo(PAGE.left, 36).lineTo(PAGE.right, 36).stroke();
    }

    doc.strokeColor(THEME.line).lineWidth(0.5)
      .moveTo(PAGE.left, 792).lineTo(PAGE.right, 792).stroke();

    const footerDisclaimer = 'bills. • Documento confidencial generado bajo demanda • Analítica institucional de finanzas';
    doc.fillColor(THEME.slate).font('Helvetica').fontSize(6.8)
      .text(footerDisclaimer, PAGE.left, 800, { width: 380, lineBreak: false });

    doc.fillColor(THEME.slate).font('Helvetica-Bold').fontSize(6.8)
      .text(`Página ${index + 1} de ${pages.count}`, PAGE.right - 90, 800, { width: 90, align: 'right', lineBreak: false });
  }
}

export function renderPdf(
  rows: FinancialRow[],
  summary: ReportSummary,
  presentation: ReportPresentation,
  currency: string,
  includeNotes: boolean,
  budget: ReportBudget = null,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      bufferPages: true,
      info: { Title: presentation.title, Author: 'bills.' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    cover(doc, presentation);

    const selected = new Set(presentation.sections);
    if (selected.has('summary')) {
      summaryCards(doc, summary, currency, budget);
      if (summary.insights?.length) {
        insights(doc, summary);
      }
    }
    if (selected.has('comparison')) {
      comparison(doc, summary, currency);
    }
    if (selected.has('budget')) {
      budgetSection(doc, budget, currency);
    }
    const hasCat = selected.has('categories');
    const hasMerch = selected.has('merchants');
    if (hasCat && hasMerch) {
      renderSideBySideDistribution(doc, summary, currency);
    } else if (hasCat) {
      distribution(doc, summary, currency, 'categories');
    } else if (hasMerch) {
      distribution(doc, summary, currency, 'merchants');
    }
    if (selected.has('movements')) {
      movements(doc, rows, includeNotes, currency);
    }

    footersAndHeaders(doc, presentation);
    doc.end();
  });
}
