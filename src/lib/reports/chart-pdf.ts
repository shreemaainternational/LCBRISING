import type PDFDocument from 'pdfkit';
import type { ChartSpec } from './types';
import { BRAND, PALETTE, colorAt } from './brand';

type Doc = InstanceType<typeof PDFDocument>;
interface Rect { x: number; y: number; w: number; h: number; }

const FONT_TITLE = 'Helvetica-Bold';
const FONT_BODY = 'Helvetica';

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const r = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return r * mag;
}

function drawTitle(doc: Doc, r: Rect, title: string) {
  doc.font(FONT_TITLE).fontSize(11).fillColor(BRAND.navy).text(title, r.x, r.y, { width: r.w });
}

function drawLegend(
  doc: Doc, x: number, y: number, width: number,
  entries: { label: string; color: string }[],
) {
  let cx = x;
  let cy = y;
  doc.font(FONT_BODY).fontSize(8);
  for (const e of entries) {
    const lw = doc.widthOfString(e.label) + 18;
    if (cx + lw > x + width) { cx = x; cy += 12; }
    doc.rect(cx, cy + 2, 8, 8).fill(e.color);
    doc.fillColor(BRAND.body).text(e.label, cx + 12, cy, { lineBreak: false });
    cx += lw + 6;
  }
  return cy + 14;
}

export function drawChart(doc: Doc, r: Rect, spec: ChartSpec) {
  drawTitle(doc, r, spec.title);
  const inner: Rect = { x: r.x, y: r.y + 18, w: r.w, h: r.h - 18 };

  switch (spec.kind) {
    case 'bar':           return drawBar(doc, inner, spec, false);
    case 'stacked_bar':   return drawBar(doc, inner, spec, true);
    case 'horizontal_bar':return drawHBar(doc, inner, spec);
    case 'pie':           return drawPie(doc, inner, spec, false);
    case 'donut':         return drawPie(doc, inner, spec, true);
    case 'line':          return drawLine(doc, inner, spec, false);
    case 'area':          return drawLine(doc, inner, spec, true);
  }
}

function drawBar(doc: Doc, r: Rect, spec: ChartSpec, stacked: boolean) {
  const padL = 38, padR = 8, padT = 4, padB = 30;
  const plotX = r.x + padL;
  const plotY = r.y + padT;
  const plotW = r.w - padL - padR;
  const plotH = r.h - padT - padB - 16;
  const n = spec.labels.length || 1;
  const s = spec.series;

  const colSums = spec.labels.map((_, i) =>
    stacked ? s.reduce((a, b) => a + (b.data[i] ?? 0), 0)
            : Math.max(0, ...s.map(x => x.data[i] ?? 0)),
  );
  const maxV = niceCeil(Math.max(1, ...colSums));

  // Axes
  doc.strokeColor(BRAND.line).lineWidth(0.6);
  doc.moveTo(plotX, plotY).lineTo(plotX, plotY + plotH).stroke();
  doc.moveTo(plotX, plotY + plotH).lineTo(plotX + plotW, plotY + plotH).stroke();

  // Y grid + labels (4 ticks)
  doc.font(FONT_BODY).fontSize(7).fillColor(BRAND.muted);
  for (let t = 0; t <= 4; t++) {
    const yy = plotY + plotH - (plotH * t) / 4;
    doc.strokeColor(BRAND.line).lineWidth(0.3)
       .moveTo(plotX, yy).lineTo(plotX + plotW, yy).stroke();
    const v = (maxV * t) / 4;
    doc.fillColor(BRAND.muted).text(formatTick(v), r.x, yy - 4, { width: padL - 4, align: 'right' });
  }

  const groupW = plotW / n;
  const innerPad = Math.min(8, groupW * 0.15);
  const barsPerGroup = stacked ? 1 : s.length;
  const barW = Math.max(2, (groupW - innerPad * 2) / barsPerGroup);

  for (let i = 0; i < n; i++) {
    const gx = plotX + i * groupW + innerPad;
    if (stacked) {
      let yCursor = plotY + plotH;
      for (let si = 0; si < s.length; si++) {
        const v = s[si].data[i] ?? 0;
        const h = (v / maxV) * plotH;
        const color = s[si].color ?? colorAt(si);
        doc.rect(gx, yCursor - h, groupW - innerPad * 2, h).fill(color);
        yCursor -= h;
      }
    } else {
      for (let si = 0; si < s.length; si++) {
        const v = s[si].data[i] ?? 0;
        const h = (v / maxV) * plotH;
        const color = s[si].color ?? colorAt(si);
        doc.rect(gx + si * barW, plotY + plotH - h, barW - 1.5, h).fill(color);
      }
    }
    doc.font(FONT_BODY).fontSize(7).fillColor(BRAND.body)
       .text(spec.labels[i], gx - innerPad / 2, plotY + plotH + 4, {
         width: groupW, align: 'center', lineBreak: false,
       });
  }

  drawLegend(doc, r.x + padL, r.y + r.h - 14, r.w - padL - padR,
    s.map((sr, i) => ({ label: sr.name, color: sr.color ?? colorAt(i) })));
}

function drawHBar(doc: Doc, r: Rect, spec: ChartSpec) {
  const padL = Math.min(120, Math.max(60, longestLabelWidth(doc, spec.labels) + 8));
  const padR = 20, padT = 4, padB = 18;
  const plotX = r.x + padL;
  const plotY = r.y + padT;
  const plotW = r.w - padL - padR;
  const plotH = r.h - padT - padB;
  const data = spec.series[0]?.data ?? [];
  const maxV = niceCeil(Math.max(1, ...data));
  const n = spec.labels.length || 1;
  const rowH = plotH / n;
  const barH = Math.max(4, rowH * 0.7);

  doc.strokeColor(BRAND.line).lineWidth(0.6);
  doc.moveTo(plotX, plotY).lineTo(plotX, plotY + plotH).stroke();

  for (let i = 0; i < n; i++) {
    const v = data[i] ?? 0;
    const w = (v / maxV) * plotW;
    const yy = plotY + i * rowH + (rowH - barH) / 2;
    const color = colorAt(i);
    doc.rect(plotX, yy, w, barH).fill(color);

    doc.font(FONT_BODY).fontSize(8).fillColor(BRAND.body)
       .text(spec.labels[i], r.x, yy + barH / 2 - 4, { width: padL - 4, align: 'right', lineBreak: false });
    doc.fontSize(7).fillColor(BRAND.muted)
       .text(formatTick(v), plotX + w + 3, yy + barH / 2 - 3, { lineBreak: false });
  }
}

function longestLabelWidth(doc: Doc, labels: string[]): number {
  doc.font(FONT_BODY).fontSize(8);
  return labels.reduce((m, s) => Math.max(m, doc.widthOfString(s)), 0);
}

function drawPie(doc: Doc, r: Rect, spec: ChartSpec, donut: boolean) {
  const data = spec.series[0]?.data ?? [];
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const cx = r.x + r.w * 0.35;
  const cy = r.y + r.h / 2;
  const radius = Math.min(r.w * 0.32, r.h * 0.42);
  const inner = donut ? radius * 0.55 : 0;

  let a0 = -Math.PI / 2;
  for (let i = 0; i < data.length; i++) {
    const frac = data[i] / total;
    const a1 = a0 + frac * Math.PI * 2;
    const color = colorAt(i);
    pieSlice(doc, cx, cy, inner, radius, a0, a1, color);
    a0 = a1;
  }

  // legend column on the right
  const lx = r.x + r.w * 0.7;
  let ly = r.y + 4;
  doc.font(FONT_BODY).fontSize(8);
  for (let i = 0; i < spec.labels.length; i++) {
    const pct = ((data[i] ?? 0) / total) * 100;
    doc.rect(lx, ly + 2, 8, 8).fill(colorAt(i));
    doc.fillColor(BRAND.body)
       .text(`${spec.labels[i]} — ${pct.toFixed(1)}%`, lx + 12, ly, { width: r.w * 0.28, lineBreak: false });
    ly += 13;
    if (ly > r.y + r.h - 10) break;
  }

  if (donut) {
    doc.font(FONT_TITLE).fontSize(10).fillColor(BRAND.navy)
       .text(formatTick(total), cx - 30, cy - 6, { width: 60, align: 'center' });
  }
}

function pieSlice(
  doc: Doc, cx: number, cy: number, r0: number, r1: number,
  a0: number, a1: number, fill: string,
) {
  const x0 = cx + Math.cos(a0) * r1;
  const y0 = cy + Math.sin(a0) * r1;
  const x1 = cx + Math.cos(a1) * r1;
  const y1 = cy + Math.sin(a1) * r1;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;

  if (r0 === 0) {
    const path =
      `M ${cx} ${cy} L ${x0} ${y0} A ${r1} ${r1} 0 ${largeArc} 1 ${x1} ${y1} Z`;
    doc.path(path).fill(fill);
  } else {
    const xi0 = cx + Math.cos(a0) * r0;
    const yi0 = cy + Math.sin(a0) * r0;
    const xi1 = cx + Math.cos(a1) * r0;
    const yi1 = cy + Math.sin(a1) * r0;
    const path =
      `M ${x0} ${y0} A ${r1} ${r1} 0 ${largeArc} 1 ${x1} ${y1}` +
      ` L ${xi1} ${yi1} A ${r0} ${r0} 0 ${largeArc} 0 ${xi0} ${yi0} Z`;
    doc.path(path).fill(fill);
  }
}

function drawLine(doc: Doc, r: Rect, spec: ChartSpec, fill: boolean) {
  const padL = 38, padR = 12, padT = 4, padB = 30;
  const plotX = r.x + padL;
  const plotY = r.y + padT;
  const plotW = r.w - padL - padR;
  const plotH = r.h - padT - padB - 14;
  const n = spec.labels.length || 1;
  const allMax = Math.max(1, ...spec.series.flatMap(s => s.data));
  const maxV = niceCeil(allMax);

  // grid + y ticks
  doc.font(FONT_BODY).fontSize(7).fillColor(BRAND.muted);
  for (let t = 0; t <= 4; t++) {
    const yy = plotY + plotH - (plotH * t) / 4;
    doc.strokeColor(BRAND.line).lineWidth(0.3)
       .moveTo(plotX, yy).lineTo(plotX + plotW, yy).stroke();
    doc.fillColor(BRAND.muted)
       .text(formatTick((maxV * t) / 4), r.x, yy - 4, { width: padL - 4, align: 'right' });
  }
  doc.strokeColor(BRAND.line).lineWidth(0.6);
  doc.moveTo(plotX, plotY).lineTo(plotX, plotY + plotH).stroke();
  doc.moveTo(plotX, plotY + plotH).lineTo(plotX + plotW, plotY + plotH).stroke();

  const stepX = n > 1 ? plotW / (n - 1) : plotW;

  // X labels
  doc.font(FONT_BODY).fontSize(7).fillColor(BRAND.body);
  for (let i = 0; i < n; i++) {
    doc.text(spec.labels[i], plotX + i * stepX - 20, plotY + plotH + 4, {
      width: 40, align: 'center', lineBreak: false,
    });
  }

  // Series
  for (let si = 0; si < spec.series.length; si++) {
    const sr = spec.series[si];
    const color = sr.color ?? colorAt(si);
    const pts = sr.data.map((v, i) => ({
      x: plotX + i * stepX,
      y: plotY + plotH - (v / maxV) * plotH,
    }));

    if (fill && pts.length) {
      let path = `M ${pts[0].x} ${plotY + plotH} L ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) path += ` L ${pts[i].x} ${pts[i].y}`;
      path += ` L ${pts[pts.length - 1].x} ${plotY + plotH} Z`;
      doc.fillOpacity(0.18).path(path).fill(color).fillOpacity(1);
    }

    doc.strokeColor(color).lineWidth(1.4);
    pts.forEach((p, i) => {
      if (i === 0) doc.moveTo(p.x, p.y);
      else doc.lineTo(p.x, p.y);
    });
    doc.stroke();

    for (const p of pts) doc.circle(p.x, p.y, 2.2).fill(color);
  }

  drawLegend(doc, r.x + padL, r.y + r.h - 14, r.w - padL - padR,
    spec.series.map((s, i) => ({ label: s.name, color: s.color ?? colorAt(i) })));
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1_00_00_000) return `${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1_00_000) return `${(v / 1_00_000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}
