import PDFDocument from 'pdfkit';
import type { ReportDoc, RenderedReport } from './types';
import { BRAND, colorAt } from './brand';
import { drawChart } from './chart-pdf';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function renderPdf(doc: ReportDoc): Promise<RenderedReport> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    pdf.on('data', (c) => chunks.push(c as Buffer));
    pdf.on('error', reject);

    let pageCount = 0;
    pdf.on('end', () => {
      resolve({
        format: 'pdf',
        buffer: Buffer.concat(chunks),
        mime: 'application/pdf',
        filename: filenameFor(doc, 'pdf'),
        pageCount,
      });
    });

    drawCover(pdf, doc);
    drawKpis(pdf, doc);
    drawCharts(pdf, doc);
    drawTables(pdf, doc);
    drawNarrative(pdf, doc);

    // Footer pass — must run before .end() so we can switchToPage on
    // each buffered page and stamp the page-N-of-M footer.
    const range = pdf.bufferedPageRange();
    pageCount = range.count;
    for (let i = 0; i < range.count; i++) {
      pdf.switchToPage(range.start + i);
      drawFooter(pdf, i + 1, range.count, doc);
    }
    pdf.flushPages();
    pdf.end();
  });
}

function filenameFor(d: ReportDoc, ext: string): string {
  const safe = d.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  return `${safe}_${d.period.start.toISOString().slice(0,10)}.${ext}`;
}

function drawCover(pdf: PDFKit.PDFDocument, d: ReportDoc) {
  // Navy band
  pdf.rect(0, 0, PAGE_W, 220).fill(BRAND.navy);
  // Gold accent
  pdf.rect(0, 218, PAGE_W, 6).fill(BRAND.gold);

  pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(28)
     .text(d.metadata.clubName, MARGIN, 56, { width: CONTENT_W });
  pdf.font('Helvetica').fontSize(11)
     .text(`District ${d.metadata.districtCode} · Lions Year ${d.period.lionsYear}`, MARGIN, 92);

  pdf.font('Helvetica-Bold').fontSize(34).fillColor(BRAND.gold)
     .text(d.title, MARGIN, 130, { width: CONTENT_W });
  if (d.subtitle) {
    pdf.font('Helvetica').fontSize(13).fillColor('#E2E8F0')
       .text(d.subtitle, MARGIN, 178, { width: CONTENT_W });
  }

  // Period card
  pdf.rect(MARGIN, 250, CONTENT_W, 60).fill(BRAND.paperAlt).stroke(BRAND.line);
  pdf.fillColor(BRAND.muted).font('Helvetica').fontSize(9)
     .text('REPORTING PERIOD', MARGIN + 16, 260);
  pdf.fillColor(BRAND.navy).font('Helvetica-Bold').fontSize(16)
     .text(d.period.label, MARGIN + 16, 274);
  pdf.fillColor(BRAND.body).font('Helvetica').fontSize(10)
     .text(
       `${formatDate(d.period.start)}  —  ${formatDate(d.period.end)}`,
       MARGIN + 16, 294,
     );
  pdf.fontSize(9).fillColor(BRAND.muted)
     .text(`Generated ${new Date(d.metadata.generatedAt).toLocaleString('en-IN')}`,
           MARGIN + 16, 294, { align: 'right', width: CONTENT_W - 32 });
}

function drawKpis(pdf: PDFKit.PDFDocument, d: ReportDoc) {
  if (!d.kpis.length) return;
  const startY = 340;
  pdf.font('Helvetica-Bold').fontSize(14).fillColor(BRAND.navy)
     .text('Key Performance Indicators', MARGIN, startY);

  const cols = 4;
  const gap = 10;
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
  const cardH = 70;
  const y = startY + 24;
  d.kpis.slice(0, 12).forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + gap);
    const yy = y + row * (cardH + gap);
    const accent = k.color ?? colorAt(i);
    pdf.rect(x, yy, cardW, cardH).fill(BRAND.paper).stroke(BRAND.line);
    pdf.rect(x, yy, 4, cardH).fill(accent);
    pdf.fillColor(BRAND.muted).font('Helvetica').fontSize(8)
       .text(k.label.toUpperCase(), x + 12, yy + 10, { width: cardW - 16 });
    pdf.fillColor(BRAND.navy).font('Helvetica-Bold').fontSize(20)
       .text(String(k.value), x + 12, yy + 24, { width: cardW - 16, lineBreak: false });
    if (k.delta) {
      const positive = k.delta.startsWith('+') && !k.delta.startsWith('+0');
      pdf.fillColor(positive ? BRAND.success : (k.delta.startsWith('-') ? BRAND.danger : BRAND.muted))
         .font('Helvetica-Bold').fontSize(9)
         .text(k.delta, x + 12, yy + 50, { width: cardW - 16, lineBreak: false });
    }
    if (k.hint) {
      pdf.fillColor(BRAND.muted).font('Helvetica').fontSize(8)
         .text(k.hint, x + 12, yy + 50,
               { width: cardW - 16, align: 'right', lineBreak: false });
    }
  });
}

function drawCharts(pdf: PDFKit.PDFDocument, d: ReportDoc) {
  if (!d.charts.length) return;
  pdf.addPage();
  sectionHeader(pdf, 'Analytics & Charts');

  const cols = 2;
  const gap = 14;
  const cardW = (CONTENT_W - gap) / cols;
  const cardH = 220;
  let cursor = pdf.y + 8;

  d.charts.forEach((spec, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) cursor += cardH + gap;
    if (cursor + cardH > PAGE_H - 60) {
      pdf.addPage();
      sectionHeader(pdf, 'Analytics & Charts (cont.)');
      cursor = pdf.y + 8;
    }
    const x = MARGIN + col * (cardW + gap);
    pdf.rect(x, cursor, cardW, cardH).fill(BRAND.paper).stroke(BRAND.line);
    drawChart(pdf, { x: x + 12, y: cursor + 10, w: cardW - 24, h: cardH - 20 }, spec);
  });
}

function drawTables(pdf: PDFKit.PDFDocument, d: ReportDoc) {
  if (!d.tables.length) return;
  pdf.addPage();
  sectionHeader(pdf, 'Detailed Tables');

  for (const t of d.tables) {
    if (pdf.y > PAGE_H - 140) pdf.addPage();
    pdf.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.navy)
       .text(t.title, MARGIN, pdf.y + 8);
    pdf.moveDown(0.3);

    const cols = t.columns;
    const colW = CONTENT_W / cols.length;
    const rowH = 18;
    let y = pdf.y;

    // header
    pdf.rect(MARGIN, y, CONTENT_W, rowH).fill(BRAND.navy);
    pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    cols.forEach((c, i) => {
      pdf.text(c.label, MARGIN + i * colW + 6, y + 5,
        { width: colW - 12, align: c.align ?? 'left', lineBreak: false });
    });
    y += rowH;

    pdf.font('Helvetica').fontSize(9);
    for (let r = 0; r < t.rows.length; r++) {
      if (y > PAGE_H - 80) {
        pdf.addPage();
        sectionHeader(pdf, `${t.title} (cont.)`);
        y = pdf.y + 4;
      }
      const row = t.rows[r];
      const zebra = r % 2 === 0;
      if (zebra) pdf.rect(MARGIN, y, CONTENT_W, rowH).fill(BRAND.paperAlt);
      pdf.fillColor(BRAND.body);
      cols.forEach((c, i) => {
        const v = row[c.key];
        pdf.text(v == null ? '' : String(v), MARGIN + i * colW + 6, y + 5,
          { width: colW - 12, align: c.align ?? 'left', lineBreak: false });
      });
      y += rowH;
    }

    if (t.totals) {
      pdf.rect(MARGIN, y, CONTENT_W, rowH).fill(BRAND.gold);
      pdf.fillColor(BRAND.navy).font('Helvetica-Bold').fontSize(9);
      cols.forEach((c, i) => {
        const v = t.totals![c.key];
        pdf.text(v == null ? (i === 0 ? 'TOTAL' : '') : String(v),
          MARGIN + i * colW + 6, y + 5,
          { width: colW - 12, align: c.align ?? 'left', lineBreak: false });
      });
      y += rowH;
    }
    pdf.y = y + 14;
  }
}

function drawNarrative(pdf: PDFKit.PDFDocument, d: ReportDoc) {
  if (!d.narrative.length && !d.appendix?.length) return;
  pdf.addPage();
  sectionHeader(pdf, 'Narrative & Insights');

  for (const s of d.narrative) {
    if (pdf.y > PAGE_H - 100) pdf.addPage();
    pdf.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.navy)
       .text(s.heading, MARGIN, pdf.y + 6);
    pdf.font('Helvetica').fontSize(10).fillColor(BRAND.body)
       .moveDown(0.3)
       .text(s.body, MARGIN, pdf.y, { width: CONTENT_W, align: 'justify' });
    pdf.moveDown(0.6);
  }

  if (d.appendix?.length) {
    pdf.addPage();
    sectionHeader(pdf, 'Appendix');
    for (const s of d.appendix) {
      if (pdf.y > PAGE_H - 100) pdf.addPage();
      pdf.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.navy)
         .text(s.heading, MARGIN, pdf.y + 6);
      pdf.font('Helvetica').fontSize(9).fillColor(BRAND.body)
         .moveDown(0.3)
         .text(s.body, MARGIN, pdf.y, { width: CONTENT_W, align: 'justify' });
      pdf.moveDown(0.5);
    }
  }
}

function sectionHeader(pdf: PDFKit.PDFDocument, label: string) {
  pdf.rect(0, 0, PAGE_W, 36).fill(BRAND.navy);
  pdf.rect(0, 34, PAGE_W, 3).fill(BRAND.gold);
  pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13)
     .text(label, MARGIN, 12);
  pdf.fillColor(BRAND.body).font('Helvetica').fontSize(10);
  pdf.y = 50;
}

function drawFooter(pdf: PDFKit.PDFDocument, page: number, total: number, d: ReportDoc) {
  const y = PAGE_H - 28;
  pdf.strokeColor(BRAND.line).lineWidth(0.5)
     .moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke();
  pdf.fillColor(BRAND.muted).font('Helvetica').fontSize(8)
     .text(`${d.metadata.clubName} · ${d.title}`, MARGIN, y + 8, { lineBreak: false });
  pdf.text(`Page ${page} of ${total}`, MARGIN, y + 8,
    { width: CONTENT_W, align: 'right', lineBreak: false });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
