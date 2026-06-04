/**
 * Builds an n8n-style node-graph PDF of the LCBRS automation workflows —
 * dark canvas, rounded node cards with icon tiles, an AI-Agent node with
 * Chat Model / Memory / Tool sub-nodes on dashed connectors, and branching
 * true/false outputs. Mirrors the visual language of the n8n editor.
 *
 * Usage:   node scripts/build-workflow-canvas-pdf.js [out.pdf]
 * Output:  public/lcbrs-workflow-canvas.pdf  (A4 landscape, one flow per page)
 *
 * Pure pdfkit — every node/icon is drawn as vector art, no external assets
 * except the club lion logo (optional).
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ---- canvas palette (n8n dark editor) -------------------------------------
const BG = '#0b1020';
const GRID = '#1b2440';
const CARD = '#161c2e';
const CARD_BORDER = '#2b3656';
const INK = '#e8ecf6';
const SUBINK = '#8b97b8';
const WIRE = '#5566aa';
const WIRE_DASH = '#566089';
const ORANGE = '#f56a3c';
const GREEN = '#36c08a';
const TRUE_C = '#3ec98a';
const FALSE_C = '#e06c75';

const M = 38;

const args = process.argv.slice(2);
const outPath = args[0] || path.join(__dirname, '..', 'public', 'lcbrs-workflow-canvas.pdf');
const lionLogo = path.join(__dirname, '..', 'public', 'logo-lions.png');
const logoFallback = path.join(__dirname, '..', 'public', 'logo.png');

const PAGE = { w: 841.89, h: 595.28 }; // A4 landscape

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: M, bottom: 0, left: M, right: M },
  bufferPages: true,
});
doc.pipe(fs.createWriteStream(outPath));
doc.on('pageAdded', () => { doc.page.margins.bottom = 0; });

// ===========================================================================
// low-level helpers
// ===========================================================================
function lion() {
  try { if (fs.existsSync(logoFallback)) return logoFallback; } catch {}
  try { if (fs.existsSync(lionLogo)) return lionLogo; } catch {}
  return null;
}

function canvas(title, subtitle, isFirst) {
  if (!isFirst) doc.addPage();
  // background
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(BG);
  // dot grid
  doc.save();
  doc.fillColor(GRID);
  const step = 26;
  for (let x = 20; x < PAGE.w; x += step) {
    for (let y = 70; y < PAGE.h - 10; y += step) {
      doc.circle(x, y, 0.7).fill();
    }
  }
  doc.restore();
  // header bar
  doc.rect(0, 0, PAGE.w, 4).fill(ORANGE);
  const lg = lion();
  let tx = M;
  if (lg) { try { doc.image(lg, M, 16, { width: 26, height: 26 }); tx = M + 34; } catch {} }
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(15).text(title, tx, 16, { lineBreak: false });
  doc.fillColor(SUBINK).font('Helvetica').fontSize(9).text(subtitle, tx, 36, { lineBreak: false });
  doc.fillColor(SUBINK).font('Helvetica').fontSize(8)
    .text('Lions Club of Baroda Rising Star · automation canvas', M, 16, { width: PAGE.w - M * 2, align: 'right', lineBreak: false });
}

// rounded icon tile with a vector glyph
function tile(x, y, s, bg, glyph, gcolor) {
  doc.save();
  doc.roundedRect(x, y, s, s, s * 0.28).fill(bg);
  drawGlyph(glyph, x + s / 2, y + s / 2, s * 0.56, gcolor || '#ffffff');
  doc.restore();
}

// main node card
function node(x, y, w, h, opts = {}) {
  doc.save();
  // shadow
  doc.roundedRect(x + 1.5, y + 3, w, h, 12).fill('#00000055');
  doc.roundedRect(x, y, w, h, 12).lineWidth(1.4).fillAndStroke(CARD, opts.border || CARD_BORDER);
  // left connector stub notch
  if (opts.inPort !== false) portStub(x, y + h / 2);
  if (opts.outPort !== false) portStub(x + w, y + h / 2);

  const pad = 14;
  const is = opts.iconSize || 30;
  tile(x + pad, y + (h - is) / 2, is, opts.iconBg || '#2a3350', opts.icon, opts.iconColor);
  const tx = x + pad + is + 12;
  const tw = w - (pad + is + 12) - 12;
  if (opts.subtitle) {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(opts.title, tx, y + h / 2 - 15, { width: tw, lineBreak: false });
    doc.fillColor(SUBINK).font('Helvetica').fontSize(8.5).text(opts.subtitle, tx, y + h / 2 + 1, { width: tw, lineBreak: false });
  } else {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(opts.title, tx, y + h / 2 - 6, { width: tw, lineBreak: false });
  }
  doc.restore();
  return { x, y, w, h, cx: x + w / 2, midL: { x, y: y + h / 2 }, midR: { x: x + w, y: y + h / 2 } };
}

// small rounded square connector stub on a card edge
function portStub(x, y) {
  doc.save();
  doc.roundedRect(x - 4, y - 5, 8, 10, 2).lineWidth(1).fillAndStroke('#202842', CARD_BORDER);
  doc.restore();
}

// trigger node (rounded, left flat edge, lightning badge)
function trigger(x, y, w, h, opts = {}) {
  doc.save();
  doc.roundedRect(x + 1.5, y + 3, w, h, 14).fill('#00000055');
  // body with a flat-ish left side feel
  doc.roundedRect(x, y, w, h, 14).lineWidth(1.4).fillAndStroke(CARD, CARD_BORDER);
  portStub(x + w, y + h / 2);
  // lightning badge top-left
  doc.circle(x, y + h / 2, 0).fill();
  drawGlyph('bolt', x, y + h / 2, 18, ORANGE);
  const is = 34;
  tile(x + (w - is) / 2, y + 16, is, opts.iconBg || '#1f6f5c', opts.icon || 'form', '#7ef0c8');
  doc.restore();
  // label under (title may wrap to 2 lines; subtitle sits well below)
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5)
    .text(opts.title, x - 36, y + h + 8, { width: w + 72, align: 'center' });
  if (opts.subtitle)
    doc.fillColor(SUBINK).font('Helvetica').fontSize(8).text(opts.subtitle, x - 36, y + h + 36, { width: w + 72, align: 'center' });
  return { x, y, w, h, midR: { x: x + w, y: y + h / 2 } };
}

// decision (IF) node with true/false ports
function decision(x, y, w, h, opts = {}) {
  const n = node(x, y, w, h, { ...opts, outPort: false });
  // true / false ports on right
  const ty = y + h * 0.32, fy = y + h * 0.68;
  portStub(x + w, ty); portStub(x + w, fy);
  doc.fillColor(TRUE_C).font('Helvetica-Bold').fontSize(8).text('true', x + w + 8, ty - 5, { lineBreak: false });
  doc.fillColor(FALSE_C).font('Helvetica-Bold').fontSize(8).text('false', x + w + 8, fy - 5, { lineBreak: false });
  return { ...n, truePort: { x: x + w, y: ty }, falsePort: { x: x + w, y: fy } };
}

// capability sub-node (circle with icon + labels), as used for Chat Model/Memory/Tool
function subNode(cx, cy, r, opts = {}) {
  doc.save();
  doc.circle(cx, cy + 2, r).fill('#00000055');
  doc.circle(cx, cy, r).lineWidth(1.2).fillAndStroke(CARD, opts.border || CARD_BORDER);
  drawGlyph(opts.icon, cx, cy, r * 1.0, opts.iconColor || '#cdd6f4');
  // top port diamond
  diamond(cx, cy - r, 4, opts.portColor || WIRE_DASH);
  doc.restore();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.5).text(opts.title, cx - 60, cy + r + 8, { width: 120, align: 'center' });
  if (opts.subtitle)
    doc.fillColor(SUBINK).font('Helvetica').fontSize(7.5).text(opts.subtitle, cx - 60, cy + r + 20, { width: 120, align: 'center' });
  return { cx, cy, r, top: { x: cx, y: cy - r } };
}

function diamond(cx, cy, s, color) {
  doc.save();
  doc.moveTo(cx, cy - s).lineTo(cx + s, cy).lineTo(cx, cy + s).lineTo(cx - s, cy).closePath().fill(color);
  doc.restore();
}

function plusBtn(x, y) {
  doc.save();
  doc.roundedRect(x, y - 11, 22, 22, 6).lineWidth(1).fillAndStroke('#161c2e', CARD_BORDER);
  doc.lineWidth(1.6).strokeColor(SUBINK);
  doc.moveTo(x + 11, y - 5).lineTo(x + 11, y + 5).stroke();
  doc.moveTo(x + 6, y).lineTo(x + 16, y).stroke();
  doc.restore();
}

function arrowHead(x, y, dir, color) {
  const a = 4;
  doc.save();
  if (dir === 'right') doc.moveTo(x, y).lineTo(x - a, y - a).lineTo(x - a, y + a).closePath().fill(color);
  else if (dir === 'down') doc.moveTo(x, y).lineTo(x - a, y - a).lineTo(x + a, y - a).closePath().fill(color);
  else doc.moveTo(x, y).lineTo(x - a, y - a).lineTo(x - a, y + a).closePath().fill(color);
  doc.restore();
}

// solid horizontal wire with arrowhead
function wire(p1, p2, color = WIRE) {
  doc.save();
  doc.lineWidth(1.6).strokeColor(color);
  const mx = (p1.x + p2.x) / 2;
  doc.moveTo(p1.x, p1.y).bezierCurveTo(mx, p1.y, mx, p2.y, p2.x - 6, p2.y).stroke();
  doc.restore();
  arrowHead(p2.x - 1, p2.y, 'right', color);
}

// dashed capability wire (port under agent -> subnode top)
function dashWire(p1, p2, color = WIRE_DASH) {
  doc.save();
  doc.lineWidth(1.3).strokeColor(color).dash(3, { space: 3 });
  const my = (p1.y + p2.y) / 2;
  doc.moveTo(p1.x, p1.y).bezierCurveTo(p1.x, my, p2.x, my, p2.x, p2.y).stroke();
  doc.undash();
  doc.restore();
}

// labelled port under a node
function portLabel(x, y, label, color) {
  diamond(x, y, 4, color || WIRE_DASH);
  doc.fillColor(SUBINK).font('Helvetica').fontSize(7.5)
    .text(label, x - 40, y + 6, { width: 80, align: 'center', lineBreak: false });
}

// ===========================================================================
// vector glyphs  drawGlyph(name, cx, cy, size, color)
// ===========================================================================
function drawGlyph(name, cx, cy, s, color) {
  const r = s / 2;
  doc.save();
  doc.lineWidth(Math.max(1, s * 0.07)).strokeColor(color).fillColor(color);
  switch (name) {
    case 'bolt': {
      doc.fillColor(color);
      doc.moveTo(cx + r * 0.1, cy - r).lineTo(cx - r * 0.5, cy + r * 0.15)
        .lineTo(cx, cy + r * 0.15).lineTo(cx - r * 0.1, cy + r)
        .lineTo(cx + r * 0.5, cy - r * 0.15).lineTo(cx, cy - r * 0.15).closePath().fill();
      break;
    }
    case 'form': {
      doc.roundedRect(cx - r * 0.7, cy - r, r * 1.4, r * 2, 2).stroke();
      for (let i = -1; i <= 1; i++)
        doc.moveTo(cx - r * 0.4, cy + i * r * 0.45).lineTo(cx + r * 0.4, cy + i * r * 0.45).stroke();
      break;
    }
    case 'robot': {
      doc.roundedRect(cx - r * 0.8, cy - r * 0.5, r * 1.6, r * 1.2, 3).stroke();
      doc.circle(cx - r * 0.35, cy + r * 0.05, r * 0.16).fill(color);
      doc.circle(cx + r * 0.35, cy + r * 0.05, r * 0.16).fill(color);
      doc.moveTo(cx, cy - r * 0.5).lineTo(cx, cy - r * 0.85).stroke();
      doc.circle(cx, cy - r * 0.95, r * 0.12).fill(color);
      break;
    }
    case 'spark': {
      doc.moveTo(cx, cy - r).bezierCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r * 0.18, cy - r * 0.18, cx + r, cy)
        .bezierCurveTo(cx + r * 0.18, cy + r * 0.18, cx + r * 0.18, cy + r * 0.18, cx, cy + r)
        .bezierCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r * 0.18, cy + r * 0.18, cx - r, cy)
        .bezierCurveTo(cx - r * 0.18, cy - r * 0.18, cx - r * 0.18, cy - r * 0.18, cx, cy - r)
        .fill(color);
      break;
    }
    case 'db': {
      const w = r * 1.4, h = r * 1.8;
      doc.ellipse(cx, cy - h / 2 + r * 0.25, w / 2, r * 0.32).stroke();
      doc.moveTo(cx - w / 2, cy - h / 2 + r * 0.25).lineTo(cx - w / 2, cy + h / 2 - r * 0.25).stroke();
      doc.moveTo(cx + w / 2, cy - h / 2 + r * 0.25).lineTo(cx + w / 2, cy + h / 2 - r * 0.25).stroke();
      doc.ellipse(cx, cy + h / 2 - r * 0.25, w / 2, r * 0.32).stroke();
      doc.ellipse(cx, cy, w / 2, r * 0.32).stroke();
      break;
    }
    case 'globe': {
      doc.circle(cx, cy, r * 0.95).stroke();
      doc.ellipse(cx, cy, r * 0.4, r * 0.95).stroke();
      doc.moveTo(cx - r * 0.95, cy).lineTo(cx + r * 0.95, cy).stroke();
      break;
    }
    case 'chat': {
      doc.roundedRect(cx - r * 0.85, cy - r * 0.7, r * 1.7, r * 1.2, 4).stroke();
      doc.moveTo(cx - r * 0.3, cy + r * 0.5).lineTo(cx - r * 0.5, cy + r * 0.95).lineTo(cx + r * 0.05, cy + r * 0.5).stroke();
      break;
    }
    case 'card': {
      doc.roundedRect(cx - r * 0.9, cy - r * 0.6, r * 1.8, r * 1.2, 3).stroke();
      doc.moveTo(cx - r * 0.9, cy - r * 0.15).lineTo(cx + r * 0.9, cy - r * 0.15).stroke();
      break;
    }
    case 'branch': {
      doc.moveTo(cx - r * 0.6, cy + r * 0.8).lineTo(cx - r * 0.6, cy - r * 0.2).stroke();
      doc.moveTo(cx - r * 0.6, cy).bezierCurveTo(cx - r * 0.6, cy - r * 0.7, cx + r * 0.6, cy - r * 0.1, cx + r * 0.6, cy - r * 0.8).stroke();
      doc.circle(cx - r * 0.6, cy - r * 0.45, r * 0.18).fill(color);
      doc.circle(cx + r * 0.6, cy - r * 0.8, r * 0.18).fill(color);
      doc.circle(cx - r * 0.6, cy + r * 0.8, r * 0.18).fill(color);
      break;
    }
    case 'user': {
      doc.circle(cx, cy - r * 0.35, r * 0.42).stroke();
      doc.moveTo(cx - r * 0.75, cy + r * 0.85).bezierCurveTo(cx - r * 0.75, cy + r * 0.1, cx + r * 0.75, cy + r * 0.1, cx + r * 0.75, cy + r * 0.85).stroke();
      break;
    }
    case 'mail': {
      doc.roundedRect(cx - r * 0.9, cy - r * 0.65, r * 1.8, r * 1.3, 2).stroke();
      doc.moveTo(cx - r * 0.9, cy - r * 0.55).lineTo(cx, cy + r * 0.2).lineTo(cx + r * 0.9, cy - r * 0.55).stroke();
      break;
    }
    case 'bell': {
      doc.moveTo(cx - r * 0.65, cy + r * 0.35).bezierCurveTo(cx - r * 0.65, cy - r * 0.7, cx + r * 0.65, cy - r * 0.7, cx + r * 0.65, cy + r * 0.35).stroke();
      doc.moveTo(cx - r * 0.8, cy + r * 0.4).lineTo(cx + r * 0.8, cy + r * 0.4).stroke();
      doc.circle(cx, cy + r * 0.7, r * 0.14).fill(color);
      break;
    }
    case 'refresh': {
      doc.arc ? null : null;
      doc.path(`M ${cx + r * 0.7} ${cy} A ${r * 0.7} ${r * 0.7} 0 1 1 ${cx} ${cy - r * 0.7}`).stroke();
      doc.moveTo(cx, cy - r * 0.7).lineTo(cx - r * 0.25, cy - r * 0.95).stroke();
      doc.moveTo(cx, cy - r * 0.7).lineTo(cx + r * 0.2, cy - r * 0.45).stroke();
      break;
    }
    case 'shield': {
      doc.moveTo(cx, cy - r).lineTo(cx + r * 0.8, cy - r * 0.55).lineTo(cx + r * 0.8, cy + r * 0.2)
        .bezierCurveTo(cx + r * 0.8, cy + r * 0.7, cx, cy + r, cx, cy + r)
        .bezierCurveTo(cx, cy + r, cx - r * 0.8, cy + r * 0.7, cx - r * 0.8, cy + r * 0.2)
        .lineTo(cx - r * 0.8, cy - r * 0.55).closePath().stroke();
      break;
    }
    case 'heart': {
      doc.moveTo(cx, cy + r * 0.7)
        .bezierCurveTo(cx - r * 1.1, cy - r * 0.2, cx - r * 0.4, cy - r * 0.9, cx, cy - r * 0.3)
        .bezierCurveTo(cx + r * 0.4, cy - r * 0.9, cx + r * 1.1, cy - r * 0.2, cx, cy + r * 0.7).fill(color);
      break;
    }
    case 'doc': {
      doc.roundedRect(cx - r * 0.65, cy - r * 0.9, r * 1.3, r * 1.8, 2).stroke();
      for (let i = 0; i < 3; i++) doc.moveTo(cx - r * 0.4, cy - r * 0.4 + i * r * 0.45).lineTo(cx + r * 0.4, cy - r * 0.4 + i * r * 0.45).stroke();
      break;
    }
    case 'qr': {
      const u = r * 0.5;
      doc.lineWidth(Math.max(1, s * 0.05));
      doc.rect(cx - r * 0.8, cy - r * 0.8, u, u).stroke();
      doc.rect(cx + r * 0.3, cy - r * 0.8, u, u).stroke();
      doc.rect(cx - r * 0.8, cy + r * 0.3, u, u).stroke();
      doc.rect(cx + r * 0.35, cy + r * 0.35, r * 0.4, r * 0.4).fill(color);
      break;
    }
    default: {
      doc.circle(cx, cy, r * 0.6).stroke();
    }
  }
  doc.restore();
}

// ===========================================================================
// WORKFLOW 1 — New member onboarding (mirrors the reference graph)
// ===========================================================================
function flowOnboarding() {
  canvas('Workflow · New Member Onboarding',
    "Trigger -> AI Agent (model · memory · tools) -> routing -> notify, exactly like an n8n graph", true);

  const t = trigger(70, 200, 96, 92, { title: "On 'New Member' form submission", subtitle: 'Website / Mobile intake', icon: 'form' });

  const agent = node(290, 206, 210, 80, {
    title: 'AI Agent', subtitle: 'Tools Agent', icon: 'robot', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a',
  });

  // ports under the agent
  const py = agent.y + agent.h + 4;
  const pChat = agent.x + 60, pMem = agent.x + 115, pTool = agent.x + 170;
  portLabel(pChat, py, 'Chat Model*', '#9b8cff');
  portLabel(pMem, py, 'Memory', '#6bd6c0');
  portLabel(pTool, py, 'Tool', '#e0b15a');
  plusBtn(pTool - 11, py + 44);

  // sub-nodes row
  const subY = 430, R = 26;
  const sChat = subNode(265, subY, R, { title: 'OpenAI Chat Model', subtitle: 'gpt-4o-mini', icon: 'spark', iconColor: '#74e3b0', border: '#2f6b53' });
  const sMem = subNode(360, subY, R, { title: 'Supabase Memory', subtitle: 'Postgres context', icon: 'db', iconColor: '#7fb4ff', border: '#34507f' });
  const sTool1 = subNode(470, subY, R, { title: 'Lions REST', subtitle: 'MyLCI sync', icon: 'globe', iconColor: '#c4b5fd', border: '#4b3f7a' });
  const sTool2 = subNode(548, subY, R, { title: 'WhatsApp', subtitle: 'Twilio / Meta', icon: 'chat', iconColor: '#74e3b0', border: '#2f6b53' });
  const sTool3 = subNode(626, subY, R, { title: 'Razorpay', subtitle: 'dues invoice', icon: 'card', iconColor: '#7fb4ff', border: '#34507f' });

  // capability dashed wires
  dashWire({ x: pChat, y: py + 4 }, sChat.top, '#9b8cff');
  dashWire({ x: pMem, y: py + 4 }, sMem.top, '#6bd6c0');
  dashWire({ x: pTool, y: py + 4 }, sTool1.top, '#e0b15a');
  dashWire({ x: pTool, y: py + 4 }, sTool2.top, '#e0b15a');
  dashWire({ x: pTool, y: py + 4 }, sTool3.top, '#e0b15a');

  // decision
  const dec = decision(560, 206, 150, 80, { title: 'Is an officer?', icon: 'branch', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });

  // branch end nodes
  // top branch (true) — add to officer channel
  const chTop = node(742, 76, 62, 62, { title: '', icon: 'chat', iconBg: '#2a2350', iconColor: '#9b8cff', border: '#4b3f7a', inPort: true, outPort: true, iconSize: 30 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text('Add to officer channel', 700, 144, { width: 150, align: 'center' });
  doc.fillColor(SUBINK).font('Helvetica').fontSize(8).text('invite: #board', 700, 158, { width: 150, align: 'center' });
  plusBtn(820, 107);

  // bottom branch (false) — update profile
  const chBot = node(742, 326, 62, 62, { title: '', icon: 'user', iconBg: '#1f3a5a', iconColor: '#7fb4ff', border: '#34507f', inPort: true, outPort: true, iconSize: 30 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text('Update member profile', 700, 394, { width: 150, align: 'center' });
  doc.fillColor(SUBINK).font('Helvetica').fontSize(8).text('updateProfile: member', 700, 408, { width: 150, align: 'center' });
  plusBtn(820, 357);

  // main wires
  wire(t.midR, agent.midL);
  wire(agent.midR, dec.midL);
  // branch wires (curved)
  branchWire(dec.truePort, { x: 742, y: 107 }, TRUE_C);
  branchWire(dec.falsePort, { x: 742, y: 357 }, FALSE_C);
}

function branchWire(p1, p2, color) {
  doc.save();
  doc.lineWidth(1.6).strokeColor(color);
  const mx = (p1.x + p2.x) / 2;
  doc.moveTo(p1.x, p1.y).bezierCurveTo(mx, p1.y, mx, p2.y, p2.x - 6, p2.y).stroke();
  doc.restore();
  arrowHead(p2.x - 1, p2.y, 'right', color);
}

// ===========================================================================
// WORKFLOW 2 — Donation received -> receipt & thank-you
// ===========================================================================
function flowDonation() {
  canvas('Workflow · Donation Received -> Receipt & Thank-you',
    'Payment captured -> verify -> AI receipt + multi-channel acknowledgement', false);

  const t = trigger(70, 200, 96, 92, { title: 'Donation captured', subtitle: 'Razorpay / UPI / PhonePe', icon: 'card', iconBg: '#1f3a5a' });

  const verify = node(290, 206, 180, 80, { title: 'Verify payment', subtitle: 'HMAC signature check', icon: 'shield', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });

  const agent = node(540, 206, 200, 80, { title: 'AI Receipt Agent', subtitle: '80G PDF + narrative', icon: 'robot', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });

  const py = agent.y + agent.h + 4;
  const pModel = agent.x + 70, pMem = agent.x + 130, pTool = agent.x + 175;
  portLabel(pModel, py, 'Chat Model', '#9b8cff');
  portLabel(pMem, py, 'Memory', '#6bd6c0');
  portLabel(pTool, py, 'Tool', '#e0b15a');

  const subY = 430, R = 26;
  const sModel = subNode(520, subY, R, { title: 'OpenAI', subtitle: 'thank-you copy', icon: 'spark', iconColor: '#74e3b0', border: '#2f6b53' });
  const sMem = subNode(610, subY, R, { title: 'Supabase', subtitle: 'donor history', icon: 'db', iconColor: '#7fb4ff', border: '#34507f' });
  const sTool1 = subNode(700, subY, R, { title: 'PDF receipt', subtitle: 'PDFKit 80G', icon: 'doc', iconColor: '#e0b15a', border: '#6b5a2f' });
  dashWire({ x: pModel, y: py + 4 }, sModel.top, '#9b8cff');
  dashWire({ x: pMem, y: py + 4 }, sMem.top, '#6bd6c0');
  dashWire({ x: pTool, y: py + 4 }, sTool1.top, '#e0b15a');

  // three fan-out channels on the right
  const mail = node(770, 120, 60, 56, { title: '', icon: 'mail', iconBg: '#1f3a5a', iconColor: '#7fb4ff', inPort: true, outPort: false, iconSize: 28 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('Email (Resend)', 740, 182, { width: 120, align: 'center' });
  const wa = node(770, 212, 60, 56, { title: '', icon: 'chat', iconBg: '#1f5a4f', iconColor: '#74e3b0', inPort: true, outPort: false, iconSize: 28 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('WhatsApp', 740, 274, { width: 120, align: 'center' });

  wire(t.midR, verify.midL);
  wire(verify.midR, agent.midL);
  branchWire(agent.midR, { x: 770, y: 148 }, WIRE);
  branchWire(agent.midR, { x: 770, y: 240 }, WIRE);
}

// ===========================================================================
// WORKFLOW 3 — Daily cron orchestration
// ===========================================================================
function flowCron() {
  canvas('Workflow · Daily Automation (Vercel Cron)',
    'Scheduled trigger -> automation engine claims jobs -> dispatch across channels & reports', false);

  const t = trigger(70, 220, 96, 92, { title: 'Cron 03:00 daily', subtitle: 'Bearer CRON_SECRET', icon: 'refresh', iconBg: '#3a2e63' });

  const engine = node(290, 226, 200, 80, { title: 'Automation engine', subtitle: 'claims automation_jobs', icon: 'robot', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });

  const py = engine.y + engine.h + 4;
  const pMem = engine.x + 100, pTool = engine.x + 160;
  portLabel(pMem, py, 'Queue', '#6bd6c0');
  portLabel(pTool, py, 'Handlers', '#e0b15a');
  const subY = 450, R = 26;
  const sQ = subNode(330, subY, R, { title: 'Job queue', subtitle: 'Supabase', icon: 'db', iconColor: '#7fb4ff', border: '#34507f' });
  const sH = subNode(450, subY, R, { title: 'Handlers', subtitle: 'reminders/receipts', icon: 'spark', iconColor: '#74e3b0', border: '#2f6b53' });
  dashWire({ x: pMem, y: py + 4 }, sQ.top, '#6bd6c0');
  dashWire({ x: pTool, y: py + 4 }, sH.top, '#e0b15a');

  // fan-out actions
  const acts = [
    { y: 96, icon: 'mail', bg: '#1f3a5a', c: '#7fb4ff', label: 'Dues reminder (Email)' },
    { y: 178, icon: 'chat', bg: '#1f5a4f', c: '#74e3b0', label: 'WhatsApp nudge' },
    { y: 260, icon: 'bell', bg: '#3a2e63', c: '#c4b5fd', label: 'Web Push broadcast' },
    { y: 342, icon: 'doc', bg: '#5a4a1f', c: '#e0b15a', label: 'Period report PDF' },
  ];
  acts.forEach((a) => {
    node(740, a.y, 60, 56, { title: '', icon: a.icon, iconBg: a.bg, iconColor: a.c, inPort: true, outPort: false, iconSize: 28 });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.5).text(a.label, 700, a.y + 60, { width: 140, align: 'center' });
    branchWire(engine.midR, { x: 740, y: a.y + 28 }, WIRE);
  });

  wire(t.midR, engine.midL);
}

// ===========================================================================
function legendStrip() {
  // a slim legend at the bottom of each page is drawn here for page 1 only
}

// build
flowOnboarding();
flowDonation();
flowCron();

// page footers
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc.fillColor(SUBINK).font('Helvetica').fontSize(7.5)
    .text('Solid wire = main path   ·   dashed = agent capability (model / memory / tool)   ·   true/false = routing',
      M, PAGE.h - 22, { width: PAGE.w - M * 2 - 80, align: 'left', lineBreak: false });
  doc.text(`${i + 1} / ${range.count}`, M, PAGE.h - 22, { width: PAGE.w - M * 2, align: 'right', lineBreak: false });
}

doc.end();
console.log('Wrote', outPath);
