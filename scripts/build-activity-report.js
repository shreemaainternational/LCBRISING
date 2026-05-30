/**
 * Generates a professional Service Activities Report (PDF) for the
 * Lions Club of Baroda Rising Star from the exported spreadsheet data.
 *
 * Usage:
 *   node scripts/build-activity-report.js [activities.json] [out.pdf] [photosDir]
 *
 * Structure:
 *   1. Branded cover with summary KPIs
 *   2. Contents — activities grouped by Lions cause category
 *   3. For each cause: a section divider page, then ONE FULL PAGE PER
 *      ACTIVITY with all details, an editable photo, and a full narrative.
 *
 * EDITABLE PHOTOS ----------------------------------------------------------
 * Each activity page shows a photo. Drop an image into the photos directory
 * (default: report-assets/photos) and re-run. Lookup order per activity:
 *   1. report-assets/photos/<NN>.(jpg|jpeg|png)     e.g. 01.jpg, 02.png
 *   2. report-assets/photos/<title-slug>.(jpg|...)  e.g. food-for-hunger.jpg
 *   3. report-assets/photos/causes/<cause-slug>.jpg (per-cause fallback)
 * If none is found, a labelled placeholder shows exactly which file to add.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ---- palette (matches the club brand) -------------------------------------
const NAVY = '#172554';
const NAVY2 = '#1e3a8a';
const GOLD = '#c99700';
const GOLD_BRIGHT = '#fbbf24';
const INK = '#1f2937';
const MUTE = '#6b7280';
const LINE = '#e5e7eb';
const PANEL = '#f8fafc';

const CLUB = 'LIONS CLUB OF BARODA RISING STAR';
const SUB = 'Club No. 179323   |   District 3232 F1   |   Region 6   |   Zone 1';
const YEAR = 'Lions Year 2025 - 2026';

// ---- args / paths ----------------------------------------------------------
const args = process.argv.slice(2);
const dataPath = args[0] || '/tmp/activities.json';
const outPath = args[1] || '/tmp/Activity-Report.pdf';
const photosDir = args[2] || path.join(__dirname, '..', 'report-assets', 'photos');
const logoPath = path.join(__dirname, '..', 'public', 'logo.png');

// ---- cause taxonomy (maps spreadsheet causes -> website "Global Causes") ---
// order defines the grouping order in the report.
const CAUSE_ORDER = [
  'Hunger Relief', 'Childhood Cancer', 'Diabetes', 'Vision', 'Environment',
  'Disaster Relief', 'Youth', 'Humanitarian Service', 'Club Administration',
];
const CAUSE_MAP = {
  'hunger': 'Hunger Relief',
  'childhood cancer': 'Childhood Cancer',
  'diabetes': 'Diabetes',
  'vision': 'Vision',
  'environment': 'Environment',
  'disaster relief': 'Disaster Relief',
  'youth': 'Youth',
  'other humanitarian service': 'Humanitarian Service',
  'humanitarian': 'Humanitarian Service',
  'administration': 'Club Administration',
};
const normCause = (c) => CAUSE_MAP[String(c || '').trim().toLowerCase()] || (String(c || '').trim() || 'Other Service');

// ---- helpers ---------------------------------------------------------------
const clean = (s) =>
  String(s == null ? '' : s)
    .replace(/&#13;&#10;|&#10;|&#13;/g, '\n')
    .replace(/&#9;/g, '  ')
    .replace(/&amp;/g, '&')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2E00}-\u{2E7F}]/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const num = (s) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const money = (n) => 'Rs ' + Math.round(n).toLocaleString('en-IN');
const intf = (n) => Math.round(n).toLocaleString('en-IN');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s ? String(s) : '-';
  return `${String(m[2]).padStart(2, '0')} ${MONTHS[+m[1] - 1]} ${m[3]}`;
};
const sortKey = (s) => {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : 0;
};

// ---- load + model ----------------------------------------------------------
const grid = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const rows = grid.slice(1).filter((r) => (r[2] || '').trim());

const acts = rows.map((r) => ({
  start: r[0], end: r[1],
  title: clean(r[2]) || 'Untitled Activity',
  desc: clean(r[3]),
  causeRaw: clean(r[4]) || '-',
  cause: normCause(r[4]),
  type: clean(r[5]) || '-',
  served: num(r[6]), volunteers: num(r[8]), hours: num(r[9]),
  donated: num(r[11]), raised: num(r[14]), org: clean(r[13]),
})).sort((a, b) => sortKey(a.start) - sortKey(b.start));

// group by cause, ordered per CAUSE_ORDER
const groupsMap = {};
acts.forEach((a) => { (groupsMap[a.cause] = groupsMap[a.cause] || []).push(a); });
const groups = Object.keys(groupsMap)
  .sort((a, b) => {
    const ia = CAUSE_ORDER.indexOf(a), ib = CAUSE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  })
  .map((cause) => ({ cause, items: groupsMap[cause] }));

// global numbering (in grouped order)
let n = 0;
groups.forEach((g) => g.items.forEach((a) => { a.no = ++n; }));

const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
const T = {
  served: sum(acts, 'served'), volunteers: sum(acts, 'volunteers'),
  hours: sum(acts, 'hours'), donated: sum(acts, 'donated'), raised: sum(acts, 'raised'),
};

// ---- photo lookup ----------------------------------------------------------
const EXT = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
function findPhoto(a) {
  const tryNames = [
    String(a.no).padStart(2, '0'),
    String(a.no),
    slug(a.title),
  ];
  for (const base of tryNames) {
    for (const e of EXT) {
      const p = path.join(photosDir, base + e);
      if (fs.existsSync(p)) return p;
    }
  }
  for (const e of EXT) {
    const p = path.join(photosDir, 'causes', slug(a.cause) + e);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---- document --------------------------------------------------------------
const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true,
  info: { Title: 'Service Activities Report - ' + YEAR, Author: CLUB } });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const PW = doc.page.width, PH = doc.page.height;
const MX = 50, CW = PW - MX * 2;

function grad(x, y, w, h, c1, c2) {
  const g = doc.linearGradient(x, y, x, y + h); g.stop(0, c1).stop(1, c2);
  doc.rect(x, y, w, h).fill(g);
}
function safeImage(p, x, y, w, h, opts) {
  try { doc.image(p, x, y, Object.assign({ fit: [w, h], align: 'center', valign: 'center' }, opts || {})); return true; }
  catch (e) { return false; }
}
function star(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  doc.polygon(...pts).fill(color);
}

let pageNo = 0;
function chrome(label) {
  pageNo += 1;
  grad(0, 0, PW, 54, NAVY2, NAVY);
  safeImage(logoPath, MX, 9, 36, 36);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text(CLUB, MX + 46, 14, { width: CW - 200 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#ffe082').text(label, MX + 46, 31, { width: CW - 200 });
  doc.font('Helvetica').fontSize(8).fillColor('#dbe4f3').text(YEAR, PW - MX - 150, 22, { width: 150, align: 'right' });
  doc.moveTo(MX, PH - 36).lineTo(PW - MX, PH - 36).lineWidth(0.6).strokeColor(LINE).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTE).text('Service Activities Report   |   ' + YEAR, MX, PH - 30, { width: CW / 2 });
  doc.text('Page ' + pageNo, PW / 2, PH - 30, { width: CW / 2, align: 'right' });
}

// ===================== COVER =====================
function cover() {
  grad(0, 0, PW, PH, NAVY2, NAVY);
  doc.lineWidth(2.5).strokeColor(GOLD_BRIGHT).rect(24, 24, PW - 48, PH - 48).stroke();
  doc.lineWidth(0.8).strokeColor('#f1d27a').rect(32, 32, PW - 64, PH - 64).stroke();

  const cx = PW / 2;
  doc.circle(cx, 150, 62).lineWidth(2).fillAndStroke('#ffffff', GOLD_BRIGHT);
  safeImage(logoPath, cx - 50, 100, 100, 100);

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26).text(CLUB, MX, 240, { width: CW, align: 'center' });
  doc.moveTo(cx - 150, 286).lineTo(cx - 14, 286).lineWidth(1).strokeColor(GOLD_BRIGHT).stroke();
  doc.moveTo(cx + 14, 286).lineTo(cx + 150, 286).stroke();
  star(cx, 286, 7, GOLD_BRIGHT);
  doc.font('Helvetica').fontSize(11).fillColor('#ffe082').text(SUB, MX, 300, { width: CW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#fff').text(YEAR, MX, 322, { width: CW, align: 'center' });

  const py = 372;
  doc.roundedRect(MX + 40, py, CW - 80, 86, 8).fillOpacity(0.12).fill('#ffffff').fillOpacity(1);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(GOLD_BRIGHT).text('SERVICE ACTIVITIES', MX, py + 18, { width: CW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('REPORT', MX, py + 44, { width: CW, align: 'center' });

  const kpis = [[String(acts.length), 'Activities'], [intf(T.served), 'People Served'], [intf(T.volunteers), 'Volunteers'], [intf(T.hours), 'Service Hours']];
  const bw = (CW - 30) / 4;
  kpis.forEach((k, i) => {
    const x = MX + i * (bw + 10);
    doc.roundedRect(x, 492, bw, 70, 6).fillOpacity(0.14).fill('#ffffff').fillOpacity(1);
    doc.font('Helvetica-Bold').fontSize(19).fillColor(GOLD_BRIGHT).text(k[0], x, 506, { width: bw, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#e5e7eb').text(k[1], x, 534, { width: bw, align: 'center' });
  });

  doc.font('Helvetica').fontSize(11).fillColor('#ffe082')
    .text(`Funds Donated  ${money(T.donated)}        Funds Raised  ${money(T.raised)}`, MX, 584, { width: CW, align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1')
    .text(`${groups.length} cause areas served`, MX, 606, { width: CW, align: 'center' });

  const first = fmtDate(acts[0].start), last = fmtDate(acts[acts.length - 1].start);
  doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text(`Reporting period:  ${first}  -  ${last}`, MX, 700, { width: CW, align: 'center' });
  doc.fontSize(9).fillColor('#9fb3d1').text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, MX, 768, { width: CW, align: 'center' });
}

// ===================== CONTENTS (grouped) =====================
function contents() {
  doc.addPage(); chrome('Contents - Activities by Cause');
  let y = 74;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Activities Grouped by Cause', MX, y);
  y += 30;

  groups.forEach((g) => {
    if (y > PH - 120) { doc.addPage(); chrome('Contents - Activities by Cause'); y = 74; }
    const gv = { served: sum(g.items, 'served'), hours: sum(g.items, 'hours'), funds: sum(g.items, 'donated') + sum(g.items, 'raised') };
    doc.rect(MX, y, CW, 24).fill(NAVY);
    doc.circle(MX + 14, y + 12, 5).fill(GOLD_BRIGHT);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text(g.cause.toUpperCase(), MX + 28, y + 7);
    doc.font('Helvetica').fontSize(8.5).fillColor('#ffe082')
      .text(`${g.items.length} activities   |   ${intf(gv.served)} served   |   ${money(gv.funds)}`, MX, y + 8, { width: CW - 12, align: 'right' });
    y += 24;
    g.items.forEach((a, i) => {
      if (y > PH - 60) { doc.addPage(); chrome('Contents - Activities by Cause'); y = 74; }
      if (i % 2 === 0) doc.rect(MX, y, CW, 18).fill(PANEL);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GOLD).text(String(a.no).padStart(2, '0'), MX + 8, y + 5, { width: 22 });
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text(fmtDate(a.start), MX + 34, y + 5, { width: 70 });
      doc.font('Helvetica-Bold').fontSize(8.8).fillColor(NAVY).text(a.title, MX + 108, y + 5, { width: 250, ellipsis: true, lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(intf(a.served) + ' served', MX + 360, y + 5, { width: 70 });
      doc.text(money(a.donated + a.raised), MX + 430, y + 5, { width: CW - 430 - 8, align: 'right' });
      y += 18;
    });
    y += 12;
  });
}

// ===================== CAUSE DIVIDER =====================
function causeDivider(g) {
  doc.addPage(); chrome('Cause Area');
  grad(0, 54, PW, PH - 54, NAVY2, NAVY);
  const cy = 250;
  doc.font('Helvetica').fontSize(13).fillColor('#ffe082').text('LIONS CAUSE AREA', MX, cy - 60, { width: CW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(34).fillColor('#ffffff').text(g.cause.toUpperCase(), MX, cy - 20, { width: CW, align: 'center' });

  const cx = PW / 2;
  doc.moveTo(cx - 120, cy + 34).lineTo(cx - 12, cy + 34).lineWidth(1).strokeColor(GOLD_BRIGHT).stroke();
  doc.moveTo(cx + 12, cy + 34).lineTo(cx + 120, cy + 34).stroke();
  star(cx, cy + 34, 7, GOLD_BRIGHT);

  const gv = {
    served: sum(g.items, 'served'), vols: sum(g.items, 'volunteers'),
    hours: sum(g.items, 'hours'), funds: sum(g.items, 'donated') + sum(g.items, 'raised'),
  };
  const cards = [[String(g.items.length), 'Activities'], [intf(gv.served), 'People Served'], [intf(gv.vols), 'Volunteers'], [intf(gv.hours), 'Service Hours']];
  const bw = (CW - 30) / 4;
  cards.forEach((c, i) => {
    const x = MX + i * (bw + 10);
    doc.roundedRect(x, cy + 70, bw, 66, 6).fillOpacity(0.14).fill('#ffffff').fillOpacity(1);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(GOLD_BRIGHT).text(c[0], x, cy + 82, { width: bw, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#e5e7eb').text(c[1], x, cy + 108, { width: bw, align: 'center' });
  });
  doc.font('Helvetica').fontSize(12).fillColor('#ffe082').text('Total Funds Mobilised:  ' + money(gv.funds), MX, cy + 156, { width: CW, align: 'center' });

  // list of activities in this cause
  let ly = cy + 200;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('Activities in this section', MX + 60, ly, { width: CW - 120 });
  ly += 20;
  g.items.forEach((a) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD_BRIGHT).text(String(a.no).padStart(2, '0'), MX + 60, ly, { width: 24 });
    doc.font('Helvetica').fontSize(9.5).fillColor('#eef2fb').text(`${a.title}`, MX + 86, ly, { width: CW - 260, ellipsis: true, lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#9fb3d1').text(fmtDate(a.start), PW - MX - 130, ly, { width: 130 - 60, align: 'right', lineBreak: false });
    ly += 16;
  });
}

// ===================== ACTIVITY PAGE =====================
function activityPage(a) {
  doc.addPage(); chrome(`${a.cause}  -  Activity ${a.no} of ${acts.length}`);

  let y = 70;
  doc.roundedRect(MX, y, 40, 40, 6).fill(GOLD_BRIGHT);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(NAVY).text(String(a.no).padStart(2, '0'), MX, y + 10, { width: 40, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(a.title.toUpperCase(), MX + 52, y + 1, { width: CW - 52 });
  const th = doc.heightOfString(a.title.toUpperCase(), { width: CW - 52 });
  doc.font('Helvetica').fontSize(10).fillColor(GOLD).text(`${a.cause}   |   ${a.type}`, MX + 52, y + 3 + Math.max(20, th), { width: CW - 52 });

  y += Math.max(48, th + 26);
  doc.moveTo(MX, y).lineTo(PW - MX, y).lineWidth(1.4).strokeColor(GOLD_BRIGHT).stroke();
  y += 14;

  // ---- LEFT: detail panel ----
  const facts = [
    ['Date', a.start === a.end || !a.end ? fmtDate(a.start) : `${fmtDate(a.start)} - ${fmtDate(a.end)}`],
    ['Cause Area', a.cause],
    ['Project Type', a.type],
    ['People Served', intf(a.served)],
    ['Volunteers', intf(a.volunteers)],
    ['Volunteer Hours', intf(a.hours)],
    ['Funds Donated', money(a.donated)],
    ['Funds Raised', money(a.raised)],
  ];
  if (a.org) facts.push(['Organization Benefited', a.org]);

  const panelX = MX, panelW = 195, rowH = 29;
  const panelH = facts.length * rowH + 34;
  doc.roundedRect(panelX, y, panelW, panelH, 6).fill(PANEL);
  doc.rect(panelX, y, panelW, 26).fill(NAVY); doc.roundedRect(panelX, y, panelW, 12, 6).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('ACTIVITY DETAILS', panelX + 12, y + 8);
  let fy = y + 34;
  facts.forEach(([k, v]) => {
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTE).text(k.toUpperCase(), panelX + 12, fy, { width: panelW - 24 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(v, panelX + 12, fy + 9.5, { width: panelW - 24 });
    doc.moveTo(panelX + 12, fy + rowH - 6).lineTo(panelX + panelW - 12, fy + rowH - 6).lineWidth(0.5).strokeColor(LINE).stroke();
    fy += rowH;
  });

  // ---- RIGHT: photo + narrative ----
  const nx = panelX + panelW + 20, nw = PW - MX - nx;

  // editable photo slot
  const photoH = 168;
  const photo = findPhoto(a);
  if (photo) {
    doc.save().roundedRect(nx, y, nw, photoH, 6).clip();
    safeImage(photo, nx, y, nw, photoH, { cover: [nw, photoH] });
    doc.restore();
    doc.roundedRect(nx, y, nw, photoH, 6).lineWidth(1).strokeColor(GOLD_BRIGHT).stroke();
  } else {
    doc.roundedRect(nx, y, nw, photoH, 6).fill('#eef2f7');
    doc.roundedRect(nx, y, nw, photoH, 6).dash(4, { space: 3 }).lineWidth(1).strokeColor('#9aa7bd').stroke().undash();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#64748b').text('ADD ACTIVITY PHOTO', nx, y + photoH / 2 - 18, { width: nw, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text(`Drop an image as  report-assets/photos/${String(a.no).padStart(2, '0')}.jpg  and re-run`, nx, y + photoH / 2 + 2, { width: nw, align: 'center' });
  }

  let ry = y + photoH + 14;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text('ACTIVITY REPORT', nx, ry);
  doc.moveTo(nx, ry + 17).lineTo(nx + 46, ry + 17).lineWidth(2).strokeColor(GOLD_BRIGHT).stroke();
  ry += 26;

  doc.font('Helvetica').fontSize(10).fillColor(INK).text(buildLead(a), nx, ry, { width: nw, align: 'justify', lineGap: 2.5 });
  ry = doc.y + 8;

  if (a.desc && a.desc.length > 2) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTE).text('As reported by the club:', nx, ry, { width: nw });
    ry = doc.y + 3;
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(a.desc, nx, ry, { width: nw, lineGap: 2.5 });
  }

  // ---- impact ribbon ----
  const rby = PH - 92;
  grad(MX, rby, CW, 40, NAVY2, NAVY);
  const imp = [['People Served', intf(a.served)], ['Volunteers', intf(a.volunteers)], ['Service Hours', intf(a.hours)], ['Total Funds', money(a.donated + a.raised)]];
  const iw = CW / imp.length;
  imp.forEach((m, i) => {
    const x = MX + i * iw;
    if (i > 0) doc.moveTo(x, rby + 8).lineTo(x, rby + 32).lineWidth(0.5).strokeColor('#3b5a9a').stroke();
    doc.font('Helvetica-Bold').fontSize(13).fillColor(GOLD_BRIGHT).text(m[1], x, rby + 7, { width: iw, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#dbe4f3').text(m[0].toUpperCase(), x, rby + 25, { width: iw, align: 'center' });
  });
}

function buildLead(a) {
  const parts = [];
  parts.push(`On ${fmtDate(a.start)}, the Lions Club of Baroda Rising Star organised "${titleCase(a.title)}", a service initiative under the ${a.cause} cause area (${a.type}).`);
  const bits = [];
  if (a.served) bits.push(`directly benefiting ${intf(a.served)} ${a.served === 1 ? 'person' : 'people'}`);
  if (a.volunteers) bits.push(`mobilising ${intf(a.volunteers)} Lion volunteers`);
  if (a.hours) bits.push(`contributing ${intf(a.hours)} volunteer service hours`);
  if (bits.length) parts.push('The activity succeeded in ' + listJoin(bits) + '.');
  const fb = [];
  if (a.donated) fb.push(`${money(a.donated)} was donated by the club`);
  if (a.raised) fb.push(`${money(a.raised)} was raised in support of the cause`);
  if (fb.length) parts.push(capitalize(listJoin(fb)) + '.');
  if (a.org) parts.push(`The initiative was carried out in association with ${a.org}.`);
  parts.push('The project reflects the club’s ongoing commitment to its motto, "We Serve", and to the District 3232 F1 vision of Shine for a Better Tomorrow.');
  return parts.join(' ');
}
const titleCase = (s) => s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listJoin = (arr) => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

// ===================== BUILD =====================
cover();
contents();
groups.forEach((g) => {
  causeDivider(g);
  g.items.forEach((a) => activityPage(a));
});

doc.end();
stream.on('finish', () => console.log(`Wrote ${outPath}  (${pageNo} pages, ${acts.length} activities, ${groups.length} cause groups)`));
stream.on('error', (e) => { console.error('STREAM ERROR', e); process.exit(1); });
