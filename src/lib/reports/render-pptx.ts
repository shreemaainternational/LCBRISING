import PptxGenJS from 'pptxgenjs';
import type { ReportDoc, RenderedReport, ChartSpec } from './types';
import { BRAND, PALETTE, hex, colorAt } from './brand';

const W = 13.333;
const H = 7.5;

export async function renderPptx(doc: ReportDoc): Promise<RenderedReport> {
  const p = new PptxGenJS();
  p.layout = 'LAYOUT_WIDE';
  p.title = doc.title;
  p.author = doc.metadata.clubName;
  p.company = doc.metadata.clubName;

  p.defineSlideMaster({
    title: 'LCBRS_MASTER',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0,    y: 0,    w: W, h: 0.45, fill: { color: hex(BRAND.navy) } } },
      { rect: { x: 0,    y: 0.45, w: W, h: 0.05, fill: { color: hex(BRAND.gold) } } },
      { rect: { x: 0,    y: H - 0.4, w: W, h: 0.4, fill: { color: hex(BRAND.paperAlt) } } },
      { text: {
          text: doc.metadata.clubName,
          options: { x: 0.3, y: 0.07, w: 9, h: 0.3, fontSize: 12, bold: true, color: 'FFFFFF', fontFace: 'Calibri' },
      } },
      { text: {
          text: `District ${doc.metadata.districtCode} · ${doc.period.lionsYear}`,
          options: { x: W - 4.3, y: 0.07, w: 4, h: 0.3, fontSize: 10, color: 'FFE7B0', align: 'right', fontFace: 'Calibri' },
      } },
      { text: {
          text: doc.title,
          options: { x: 0.3, y: H - 0.32, w: 7, h: 0.25, fontSize: 9, color: hex(BRAND.muted), fontFace: 'Calibri' },
      } },
    ],
    slideNumber: { x: W - 0.8, y: H - 0.32, w: 0.5, h: 0.25, fontSize: 9, color: hex(BRAND.muted), align: 'right' },
  });

  coverSlide(p, doc);
  kpisSlide(p, doc);
  for (const c of chunk(doc.charts, 2)) chartsSlide(p, c);
  for (const t of doc.tables) tableSlide(p, t);
  for (const n of chunk(doc.narrative, 3)) narrativeSlide(p, 'Narrative & Insights', n);
  if (doc.appendix?.length) for (const n of chunk(doc.appendix, 4)) narrativeSlide(p, 'Appendix', n);

  const out = await p.write({ outputType: 'nodebuffer' });
  const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);

  return {
    format: 'pptx',
    buffer,
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    filename: filenameFor(doc),
  };
}

function filenameFor(d: ReportDoc): string {
  const safe = d.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  return `${safe}_${d.period.start.toISOString().slice(0,10)}.pptx`;
}

function coverSlide(p: PptxGenJS, d: ReportDoc) {
  const s = p.addSlide({ masterName: 'LCBRS_MASTER' });
  s.background = { color: hex(BRAND.navy) };
  s.addShape('rect', { x: 0, y: 4.0, w: W, h: 0.08, fill: { color: hex(BRAND.gold) } });

  s.addText(d.metadata.clubName, {
    x: 0.6, y: 1.1, w: W - 1.2, h: 0.7, fontSize: 32, bold: true,
    color: 'FFFFFF', fontFace: 'Calibri',
  });
  s.addText(`District ${d.metadata.districtCode} · Lions Year ${d.period.lionsYear}`, {
    x: 0.6, y: 1.85, w: W - 1.2, h: 0.4, fontSize: 14, color: 'E2E8F0', fontFace: 'Calibri',
  });
  s.addText(d.title, {
    x: 0.6, y: 2.6, w: W - 1.2, h: 1.0, fontSize: 44, bold: true,
    color: hex(BRAND.gold), fontFace: 'Calibri',
  });
  if (d.subtitle) {
    s.addText(d.subtitle, {
      x: 0.6, y: 3.7, w: W - 1.2, h: 0.5, fontSize: 16, color: '#E2E8F0', fontFace: 'Calibri',
    });
  }
  s.addText(d.period.label, {
    x: 0.6, y: 4.5, w: 4.5, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
  });
  s.addText(
    `${formatDate(d.period.start)} — ${formatDate(d.period.end)}`,
    { x: 0.6, y: 5.0, w: 6, h: 0.4, fontSize: 12, color: 'CBD5E1', fontFace: 'Calibri' },
  );
  s.addText(`Generated ${new Date(d.metadata.generatedAt).toLocaleString('en-IN')}`, {
    x: W - 5, y: H - 0.7, w: 4.5, h: 0.3, fontSize: 10, color: 'CBD5E1', align: 'right', fontFace: 'Calibri',
  });
}

function kpisSlide(p: PptxGenJS, d: ReportDoc) {
  if (!d.kpis.length) return;
  const s = p.addSlide({ masterName: 'LCBRS_MASTER' });
  s.addText('Key Performance Indicators', {
    x: 0.3, y: 0.6, w: W - 0.6, h: 0.5, fontSize: 22, bold: true, color: hex(BRAND.navy), fontFace: 'Calibri',
  });

  const cols = 4;
  const gap = 0.2;
  const cardW = (W - 0.6 - gap * (cols - 1)) / cols;
  const cardH = 1.3;
  d.kpis.slice(0, 12).forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.3 + col * (cardW + gap);
    const y = 1.3 + row * (cardH + gap);
    const accent = (k.color ?? colorAt(i)).replace('#','');
    s.addShape('rect', { x, y, w: cardW, h: cardH, fill: { color: 'FFFFFF' }, line: { color: hex(BRAND.line), width: 0.5 } });
    s.addShape('rect', { x, y, w: 0.08, h: cardH, fill: { color: accent } });
    s.addText(k.label.toUpperCase(), {
      x: x + 0.2, y: y + 0.1, w: cardW - 0.3, h: 0.3, fontSize: 9, color: hex(BRAND.muted), bold: true, fontFace: 'Calibri',
    });
    s.addText(String(k.value), {
      x: x + 0.2, y: y + 0.35, w: cardW - 0.3, h: 0.55, fontSize: 22, bold: true, color: hex(BRAND.navy), fontFace: 'Calibri',
    });
    if (k.delta) {
      const positive = k.delta.startsWith('+') && !k.delta.startsWith('+0');
      s.addText(k.delta, {
        x: x + 0.2, y: y + 0.95, w: cardW - 0.3, h: 0.25,
        fontSize: 11, bold: true,
        color: positive ? hex(BRAND.success) : (k.delta.startsWith('-') ? hex(BRAND.danger) : hex(BRAND.muted)),
        fontFace: 'Calibri',
      });
    }
    if (k.hint) {
      s.addText(k.hint, {
        x: x + 0.2, y: y + 0.95, w: cardW - 0.3, h: 0.25,
        fontSize: 9, color: hex(BRAND.muted), align: 'right', fontFace: 'Calibri',
      });
    }
  });
}

function chartsSlide(p: PptxGenJS, charts: ChartSpec[]) {
  const s = p.addSlide({ masterName: 'LCBRS_MASTER' });
  s.addText('Analytics & Charts', {
    x: 0.3, y: 0.6, w: W - 0.6, h: 0.5, fontSize: 22, bold: true, color: hex(BRAND.navy), fontFace: 'Calibri',
  });
  const positions = [
    { x: 0.3, y: 1.3, w: 6.3, h: 5.4 },
    { x: 6.8, y: 1.3, w: 6.3, h: 5.4 },
  ];
  charts.forEach((c, i) => addChart(p, s, c, positions[i]));
}

function addChart(p: PptxGenJS, s: PptxGenJS.Slide, c: ChartSpec, pos: { x: number; y: number; w: number; h: number }) {
  const colors = c.series.map((sr, i) => hex(sr.color ?? colorAt(i)));
  const chartTypes = p.ChartType;
  const opts: PptxGenJS.IChartOpts = {
    x: pos.x, y: pos.y, w: pos.w, h: pos.h,
    showTitle: true, title: c.title, titleFontSize: 14, titleColor: hex(BRAND.navy),
    chartColors: c.kind === 'pie' || c.kind === 'donut'
      ? c.labels.map((_, i) => hex(colorAt(i)))
      : colors,
    showLegend: true, legendPos: 'b', legendFontSize: 9,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    dataLabelFontSize: 8,
  };

  if (c.kind === 'pie' || c.kind === 'donut') {
    const data = [{
      name: c.series[0]?.name ?? c.title,
      labels: c.labels,
      values: c.series[0]?.data ?? [],
    }];
    s.addChart(c.kind === 'donut' ? chartTypes.doughnut : chartTypes.pie, data, {
      ...opts, showPercent: true, dataLabelFontSize: 9,
      holeSize: c.kind === 'donut' ? 55 : undefined,
    });
    return;
  }

  const data = c.series.map((sr) => ({
    name: sr.name,
    labels: c.labels,
    values: sr.data,
  }));

  if (c.kind === 'line' || c.kind === 'area') {
    s.addChart(c.kind === 'area' ? chartTypes.area : chartTypes.line, data, {
      ...opts, lineSmooth: true, lineDataSymbol: 'circle', lineSize: 2,
    });
    return;
  }

  if (c.kind === 'horizontal_bar') {
    s.addChart(chartTypes.bar, data, { ...opts, barDir: 'bar' });
    return;
  }

  s.addChart(chartTypes.bar, data, {
    ...opts, barDir: 'col',
    barGrouping: c.kind === 'stacked_bar' ? 'stacked' : 'clustered',
  });
}

function tableSlide(p: PptxGenJS, t: ReportDoc['tables'][number]) {
  const s = p.addSlide({ masterName: 'LCBRS_MASTER' });
  s.addText(t.title, {
    x: 0.3, y: 0.6, w: W - 0.6, h: 0.5, fontSize: 22, bold: true, color: hex(BRAND.navy), fontFace: 'Calibri',
  });

  const header = t.columns.map((c) => ({
    text: c.label,
    options: { bold: true, color: 'FFFFFF', fill: { color: hex(BRAND.navy) }, align: (c.align ?? 'left') as 'left'|'center'|'right' },
  }));
  const body = t.rows.slice(0, 24).map((r, ri) =>
    t.columns.map((c) => ({
      text: r[c.key] == null ? '' : String(r[c.key]),
      options: {
        align: (c.align ?? 'left') as 'left'|'center'|'right',
        fill: { color: ri % 2 ? 'FFFFFF' : hex(BRAND.paperAlt) },
        color: hex(BRAND.body),
      },
    })),
  );
  const rows: PptxGenJS.TableRow[] = [header, ...body];
  if (t.totals) {
    rows.push(t.columns.map((c, i) => ({
      text: t.totals![c.key] == null ? (i === 0 ? 'TOTAL' : '') : String(t.totals![c.key]),
      options: {
        bold: true, color: hex(BRAND.navy), fill: { color: hex(BRAND.gold) },
        align: (c.align ?? 'left') as 'left'|'center'|'right',
      },
    })));
  }

  s.addTable(rows, {
    x: 0.3, y: 1.2, w: W - 0.6,
    colW: t.columns.map(() => (W - 0.6) / t.columns.length),
    fontSize: 10, fontFace: 'Calibri',
    border: { type: 'solid', color: hex(BRAND.line), pt: 0.5 },
    rowH: 0.32,
  });
}

function narrativeSlide(p: PptxGenJS, title: string, items: { heading: string; body: string }[]) {
  const s = p.addSlide({ masterName: 'LCBRS_MASTER' });
  s.addText(title, {
    x: 0.3, y: 0.6, w: W - 0.6, h: 0.5, fontSize: 22, bold: true, color: hex(BRAND.navy), fontFace: 'Calibri',
  });
  let y = 1.3;
  for (const it of items) {
    s.addText(it.heading, {
      x: 0.3, y, w: W - 0.6, h: 0.4, fontSize: 14, bold: true, color: hex(BRAND.blue), fontFace: 'Calibri',
    });
    y += 0.4;
    s.addText(it.body, {
      x: 0.3, y, w: W - 0.6, h: 1.4, fontSize: 11, color: hex(BRAND.body), fontFace: 'Calibri', valign: 'top',
    });
    y += 1.5;
    if (y > H - 1) break;
  }
}

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
