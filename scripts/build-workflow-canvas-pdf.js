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
    "Trigger -> AI Agent (model · memory · tools) -> routing -> notify, exactly like an n8n graph", false);

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

// small end/action node + caption, returned with input port
function endNode(x, y, opts) {
  const s = opts.size || 60;
  node(x, y, s, s - 4, { title: '', icon: opts.icon, iconBg: opts.bg, iconColor: opts.color, inPort: true, outPort: opts.outPort === true, iconSize: 28, border: opts.border });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.8).text(opts.label, x - 44, y + s + 2, { width: s + 88, align: 'center' });
  if (opts.sub) doc.fillColor(SUBINK).font('Helvetica').fontSize(7.5).text(opts.sub, x - 44, y + s + 16, { width: s + 88, align: 'center' });
  return { in: { x, y: y + (s - 4) / 2 } };
}

// ===========================================================================
// COVER / INDEX
// ===========================================================================
const DECK = [
  ['1', 'New Member Onboarding', 'Intake -> AI agent -> route -> notify'],
  ['2', 'Donation -> Receipt & Thank-you', 'Capture -> verify -> AI receipt -> deliver'],
  ['3', 'Daily Automation (Vercel Cron)', 'Schedule -> engine -> multi-channel dispatch'],
  ['4', 'Lions SSO Sign-in (OIDC)', 'PKCE -> JWKS verify -> member upsert -> session'],
  ['5', 'Sync Engine (CSV · REST · Webhook)', 'Trigger -> validate -> upsert -> audit'],
  ['6', 'Event QR Check-in (Mobile)', 'Scan -> verify -> attendance -> confirm'],
  ['7', 'Invoice & Payment Collection', 'Invoice -> pay -> reconcile / remind'],
  ['8', 'Social & Creative Publishing', 'Activity -> AI creative -> approve -> publish'],
];

function cover() {
  // first page already exists; paint it
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(BG);
  doc.save();
  doc.fillColor(GRID);
  for (let x = 20; x < PAGE.w; x += 26) for (let y = 20; y < PAGE.h - 10; y += 26) doc.circle(x, y, 0.7).fill();
  doc.restore();
  doc.rect(0, 0, PAGE.w, 5).fill(ORANGE);

  // glow accents
  doc.save(); doc.opacity(0.10);
  doc.circle(PAGE.w - 60, 90, 150).fill('#6c5cff');
  doc.circle(70, PAGE.h - 60, 130).fill(GREEN);
  doc.opacity(1).restore();

  const lg = lion();
  let hx = M;
  if (lg) { try { doc.image(lg, M, 54, { width: 54, height: 54 }); hx = M + 66; } catch {} }
  doc.fillColor(SUBINK).font('Helvetica-Bold').fontSize(10).text('LIONS CLUB OF BARODA RISING STAR', hx, 56, { lineBreak: false, characterSpacing: 1.2 });
  doc.fillColor(SUBINK).font('Helvetica').fontSize(8.5).text('District 3232 F1 · Region 6 · Zone 1 · Vadodara, India', hx, 72, { lineBreak: false });

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(34).text('Automation Workflows', M, 120, { lineBreak: false });
  doc.fillColor('#9aa6c8').font('Helvetica').fontSize(13)
    .text('Enterprise node-graph blueprint — every trigger, AI agent, integration and route, wired end-to-end.', M, 162, { width: PAGE.w - M * 2 });

  // index (left) — two columns of 4
  const colW = (PAGE.w - M * 2 - 40) / 2;
  const startY = 215, rowH = 70;
  DECK.forEach((d, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const x = M + col * (colW + 40);
    const y = startY + row * rowH;
    doc.roundedRect(x, y, colW, rowH - 14, 10).lineWidth(1).fillAndStroke(CARD, CARD_BORDER);
    doc.roundedRect(x + 12, y + 13, 30, 30, 8).fill('#2a2350');
    doc.fillColor('#c4b5fd').font('Helvetica-Bold').fontSize(15).text(d[0], x + 12, y + 20, { width: 30, align: 'center' });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(d[1], x + 52, y + 14, { width: colW - 64, lineBreak: false });
    doc.fillColor(SUBINK).font('Helvetica').fontSize(8.5).text(d[2], x + 52, y + 32, { width: colW - 64, lineBreak: false });
  });

  // legend strip
  const ly = startY + 4 * rowH + 6;
  doc.fillColor(SUBINK).font('Helvetica-Bold').fontSize(9).text('LEGEND', M, ly, { lineBreak: false, characterSpacing: 1 });
  const items = [
    ['bolt', ORANGE, '#3a2e2a', 'Trigger'],
    ['robot', '#c4b5fd', '#3a2e63', 'AI agent / processor'],
    ['spark', '#74e3b0', '#1f5a4f', 'Capability (model/tool)'],
    ['branch', '#5fe3b8', '#1f5a4f', 'Decision (true/false)'],
    ['globe', '#7fb4ff', '#1f3a5a', 'External service'],
    ['mail', '#7fb4ff', '#1f3a5a', 'Action / channel'],
  ];
  let lx = M + 60;
  items.forEach((it) => {
    tile(lx, ly - 4, 18, it[2], it[0], it[1]);
    doc.fillColor(INK).font('Helvetica').fontSize(8.5).text(it[3], lx + 24, ly, { lineBreak: false });
    lx += 24 + doc.widthOfString(it[3]) + 26;
  });
  // wire legend
  const wy = ly + 24;
  doc.save();
  doc.lineWidth(1.6).strokeColor(WIRE).moveTo(M + 60, wy).lineTo(M + 100, wy).stroke();
  arrowHead(M + 100, wy, 'right', WIRE); doc.restore();
  doc.fillColor(INK).font('Helvetica').fontSize(8.5).text('main path', M + 108, wy - 4, { lineBreak: false });
  doc.save();
  doc.lineWidth(1.3).strokeColor(WIRE_DASH).dash(3, { space: 3 }).moveTo(M + 190, wy).lineTo(M + 230, wy).stroke();
  doc.undash(); doc.restore();
  doc.fillColor(INK).font('Helvetica').fontSize(8.5).text('agent capability (model / memory / tool)', M + 238, wy - 4, { lineBreak: false });

  const today = new Date().toISOString().slice(0, 10);
  doc.fillColor(SUBINK).text(`Generated ${today}  ·  8 workflows  ·  Next.js 16 · Supabase · Vercel  ·  Lions Year 2025-2026`, M, PAGE.h - 36, { width: PAGE.w - M * 2, align: 'center', lineBreak: false });
}

// ===========================================================================
// WORKFLOW 4 — Lions SSO sign-in (OIDC)
// ===========================================================================
function flowLogin() {
  canvas('Workflow · Lions SSO Sign-in (OIDC)',
    'PKCE + state + nonce -> token exchange -> JWKS verify -> member upsert -> session', false);

  const t = trigger(50, 206, 90, 90, { title: "Click 'Sign in with Lions'", subtitle: '/login', icon: 'user', iconBg: '#3a2e63' });
  const login = node(175, 212, 150, 78, { title: '/oidc/login', subtitle: 'PKCE · state · nonce', icon: 'shield', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });
  const idp = node(355, 212, 135, 78, { title: 'Lions IdP', subtitle: 'authorize (external)', icon: 'globe', iconBg: '#1f3a5a', iconColor: '#7fb4ff', border: '#34507f' });
  const cb = decision(520, 212, 180, 78, { title: 'New member?', subtitle: '/oidc/callback', icon: 'branch', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });

  const py = cb.y + cb.h + 4;
  const pVerify = cb.x + 55, pData = cb.x + 110, pAudit = cb.x + 155;
  portLabel(pVerify, py, 'Verify', '#9b8cff');
  portLabel(pData, py, 'Userinfo', '#6bd6c0');
  portLabel(pAudit, py, 'Audit', '#e0b15a');
  const subY = 440, R = 26;
  const sJwks = subNode(470, subY, R, { title: 'JWKS verify', subtitle: 'iss · aud · nonce', icon: 'shield', iconColor: '#74e3b0', border: '#2f6b53' });
  const sUser = subNode(560, subY, R, { title: 'userinfo', subtitle: 'claims', icon: 'globe', iconColor: '#7fb4ff', border: '#34507f' });
  const sUpsert = subNode(650, subY, R, { title: 'oauth_accounts', subtitle: 'Supabase upsert', icon: 'db', iconColor: '#c4b5fd', border: '#4b3f7a' });
  dashWire({ x: pVerify, y: py + 4 }, sJwks.top, '#9b8cff');
  dashWire({ x: pData, y: py + 4 }, sUser.top, '#6bd6c0');
  dashWire({ x: pAudit, y: py + 4 }, sUpsert.top, '#e0b15a');

  endNode(742, 110, { icon: 'user', bg: '#1f5a4f', color: '#74e3b0', label: 'Provision + welcome', sub: 'role mapping', border: '#2f6b53' });
  endNode(742, 300, { icon: 'shield', bg: '#1f3a5a', color: '#7fb4ff', label: 'Update claims + session', sub: 'redirect /admin', border: '#34507f' });

  wire(t.midR, login.midL);
  wire(login.midR, idp.midL);
  wire(idp.midR, cb.midL);
  branchWire(cb.truePort, { x: 742, y: 138 }, TRUE_C);
  branchWire(cb.falsePort, { x: 742, y: 328 }, FALSE_C);
}

// ===========================================================================
// WORKFLOW 5 — Sync engine
// ===========================================================================
function flowSync() {
  canvas('Workflow · Sync Engine (CSV · REST · Webhook)',
    'Officer / cron / webhook -> runSyncJob -> Zod validate -> upsert -> audit + queue', false);

  const t = trigger(50, 206, 90, 90, { title: 'Sync trigger', subtitle: 'CSV · REST · webhook', icon: 'refresh', iconBg: '#3a2e63' });
  const run = node(180, 212, 185, 78, { title: 'runSyncJob', subtitle: 'opens sync_logs', icon: 'robot', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });
  const dec = decision(420, 212, 175, 78, { title: 'All rows valid?', subtitle: 'Zod per row', icon: 'branch', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });

  const py = run.y + run.h + 4;
  const pVal = run.x + 55, pSrc = run.x + 105, pStore = run.x + 150;
  portLabel(pVal, py, 'Validate', '#9b8cff');
  portLabel(pSrc, py, 'Source', '#6bd6c0');
  portLabel(pStore, py, 'Store', '#e0b15a');
  const subY = 440, R = 26;
  const sZod = subNode(255, subY, R, { title: 'Zod schema', subtitle: 'per-row', icon: 'shield', iconColor: '#74e3b0', border: '#2f6b53' });
  const sRest = subNode(360, subY, R, { title: 'Lions REST', subtitle: 'paginated', icon: 'globe', iconColor: '#7fb4ff', border: '#34507f' });
  const sUp = subNode(465, subY, R, { title: 'Supabase', subtitle: 'upsert', icon: 'db', iconColor: '#c4b5fd', border: '#4b3f7a' });
  dashWire({ x: pVal, y: py + 4 }, sZod.top, '#9b8cff');
  dashWire({ x: pSrc, y: py + 4 }, sRest.top, '#6bd6c0');
  dashWire({ x: pStore, y: py + 4 }, sUp.top, '#e0b15a');

  endNode(742, 110, { icon: 'doc', bg: '#1f5a4f', color: '#74e3b0', label: 'Success + audit', sub: 'records upserted', border: '#2f6b53' });
  endNode(742, 300, { icon: 'refresh', bg: '#5a3a1f', color: '#e0b15a', label: 'Partial + failures[]', sub: 'queued for revive', border: '#6b5a2f' });

  wire(t.midR, run.midL);
  wire(run.midR, dec.midL);
  branchWire(dec.truePort, { x: 742, y: 138 }, TRUE_C);
  branchWire(dec.falsePort, { x: 742, y: 328 }, FALSE_C);
}

// ===========================================================================
// WORKFLOW 6 — Event QR check-in
// ===========================================================================
function flowCheckin() {
  canvas('Workflow · Event QR Check-in (Mobile)',
    'Scan QR -> verify token -> record attendance -> confirm / reject', false);

  const t = trigger(50, 206, 90, 90, { title: 'Scan QR', subtitle: '/m/checkin', icon: 'qr', iconBg: '#1f3a5a' });
  const verify = node(180, 212, 190, 78, { title: 'Check-in verify', subtitle: '/events/:id/checkin', icon: 'shield', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });
  const dec = decision(425, 212, 185, 78, { title: 'Valid & not duplicate?', subtitle: 'token + attendance', icon: 'branch', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });

  const py = verify.y + verify.h + 4;
  const pTok = verify.x + 60, pStore = verify.x + 130;
  portLabel(pTok, py, 'QR token', '#9b8cff');
  portLabel(pStore, py, 'Attendance', '#6bd6c0');
  const subY = 440, R = 26;
  const sTok = subNode(265, subY, R, { title: 'Signed token', subtitle: 'event + member', icon: 'qr', iconColor: '#74e3b0', border: '#2f6b53' });
  const sAtt = subNode(380, subY, R, { title: 'Supabase', subtitle: 'attendance', icon: 'db', iconColor: '#7fb4ff', border: '#34507f' });
  dashWire({ x: pTok, y: py + 4 }, sTok.top, '#9b8cff');
  dashWire({ x: pStore, y: py + 4 }, sAtt.top, '#6bd6c0');

  endNode(742, 110, { icon: 'bell', bg: '#1f5a4f', color: '#74e3b0', label: 'Mark present + push', sub: 'confirmation', border: '#2f6b53' });
  endNode(742, 300, { icon: 'shield', bg: '#5a1f2a', color: '#e06c75', label: 'Reject', sub: 'used / invalid', border: '#7a2f3a' });

  wire(t.midR, verify.midL);
  wire(verify.midR, dec.midL);
  branchWire(dec.truePort, { x: 742, y: 138 }, TRUE_C);
  branchWire(dec.falsePort, { x: 742, y: 328 }, FALSE_C);
}

// ===========================================================================
// WORKFLOW 7 — Invoice & payment collection
// ===========================================================================
function flowInvoice() {
  canvas('Workflow · Invoice & Payment Collection',
    'Create invoice -> generate & send -> /pay (UPI · Razorpay · PhonePe) -> reconcile / remind', false);

  const t = trigger(50, 206, 90, 90, { title: 'Create invoice', subtitle: 'admin / recurring', icon: 'doc', iconBg: '#5a4a1f' });
  const prep = node(175, 212, 185, 78, { title: 'Generate & send', subtitle: 'PDF · Email · WhatsApp', icon: 'mail', iconBg: '#1f3a5a', iconColor: '#7fb4ff', border: '#34507f' });
  const pay = node(395, 212, 140, 78, { title: 'Payment', subtitle: '/pay/:id', icon: 'card', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });
  const dec = decision(560, 212, 150, 78, { title: 'Paid?', subtitle: 'webhook / verify', icon: 'branch', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });

  const py = pay.y + pay.h + 4;
  const pG1 = pay.x + 45, pG2 = pay.x + 95;
  portLabel(pG1, py, 'Gateway', '#e0b15a');
  portLabel(pG2, py, 'QR / UPI', '#6bd6c0');
  const subY = 440, R = 26;
  const sRzp = subNode(390, subY, R, { title: 'Razorpay', subtitle: 'cards / netbank', icon: 'card', iconColor: '#7fb4ff', border: '#34507f' });
  const sUpi = subNode(490, subY, R, { title: 'UPI QR', subtitle: 'GPay / PhonePe', icon: 'qr', iconColor: '#74e3b0', border: '#2f6b53' });
  const sPp = subNode(590, subY, R, { title: 'PhonePe', subtitle: 'standard checkout', icon: 'card', iconColor: '#c4b5fd', border: '#4b3f7a' });
  dashWire({ x: pG1, y: py + 4 }, sRzp.top, '#e0b15a');
  dashWire({ x: pG2, y: py + 4 }, sUpi.top, '#6bd6c0');
  dashWire({ x: pG1, y: py + 4 }, sPp.top, '#e0b15a');

  endNode(742, 110, { icon: 'doc', bg: '#1f5a4f', color: '#74e3b0', label: 'Receipt + reconcile', sub: 'audit log', border: '#2f6b53' });
  endNode(742, 300, { icon: 'bell', bg: '#5a4a1f', color: '#e0b15a', label: 'Reminder', sub: 'recurring cycle', border: '#6b5a2f' });

  wire(t.midR, prep.midL);
  wire(prep.midR, pay.midL);
  wire(pay.midR, dec.midL);
  branchWire(dec.truePort, { x: 742, y: 138 }, TRUE_C);
  branchWire(dec.falsePort, { x: 742, y: 328 }, FALSE_C);
}

// ===========================================================================
// WORKFLOW 8 — Social & creative publishing
// ===========================================================================
function flowSocial() {
  canvas('Workflow · Social & Creative Publishing',
    'Activity logged -> AI creative agent (copy + poster) -> approve -> publish to channels', false);

  const t = trigger(50, 206, 90, 90, { title: 'Activity logged', subtitle: 'mobile / admin', icon: 'spark', iconBg: '#3a2e63' });
  const agent = node(180, 212, 205, 78, { title: 'AI Creative Agent', subtitle: 'caption + poster', icon: 'robot', iconBg: '#3a2e63', iconColor: '#c4b5fd', border: '#4b3f7a' });
  const approve = node(440, 212, 150, 78, { title: 'Approve', subtitle: 'admin review', icon: 'shield', iconBg: '#1f5a4f', iconColor: '#5fe3b8', border: '#2f6b53' });

  const py = agent.y + agent.h + 4;
  const pModel = agent.x + 65, pMedia = agent.x + 130, pTool = agent.x + 175;
  portLabel(pModel, py, 'Copy', '#9b8cff');
  portLabel(pMedia, py, 'Poster', '#6bd6c0');
  portLabel(pTool, py, 'Media', '#e0b15a');
  const subY = 440, R = 26;
  const sAI = subNode(270, subY, R, { title: 'OpenAI', subtitle: 'EN + GU copy', icon: 'spark', iconColor: '#74e3b0', border: '#2f6b53' });
  const sCanva = subNode(370, subY, R, { title: 'Canva', subtitle: 'branded poster', icon: 'spark', iconColor: '#c4b5fd', border: '#4b3f7a' });
  const sCloud = subNode(470, subY, R, { title: 'Cloudinary', subtitle: 'media CDN', icon: 'globe', iconColor: '#7fb4ff', border: '#34507f' });
  dashWire({ x: pModel, y: py + 4 }, sAI.top, '#9b8cff');
  dashWire({ x: pMedia, y: py + 4 }, sCanva.top, '#6bd6c0');
  dashWire({ x: pTool, y: py + 4 }, sCloud.top, '#e0b15a');

  const chans = [
    { y: 96, bg: '#1f3a5a', c: '#7fb4ff', label: 'Facebook Page' },
    { y: 206, bg: '#3a2e63', c: '#c4b5fd', label: 'Instagram' },
    { y: 316, bg: '#1f5a4f', c: '#74e3b0', label: 'LinkedIn' },
  ];
  chans.forEach((c) => {
    endNode(742, c.y, { icon: 'globe', bg: c.bg, color: c.c, label: c.label, border: CARD_BORDER });
    branchWire(approve.midR, { x: 742, y: c.y + 28 }, WIRE);
  });

  wire(t.midR, agent.midL);
  wire(agent.midR, approve.midL);
}

// ===========================================================================
// build deck
// ===========================================================================
const PAGE_TITLES = [
  'Cover · Index',
  'New Member Onboarding', 'Donation -> Receipt', 'Daily Automation (Cron)',
  'Lions SSO Sign-in (OIDC)', 'Sync Engine', 'Event QR Check-in',
  'Invoice & Payment', 'Social & Creative',
];

cover();
flowOnboarding();
flowDonation();
flowCron();
flowLogin();
flowSync();
flowCheckin();
flowInvoice();
flowSocial();

// page footers (skip cover)
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  if (i === 0) continue;
  doc.fillColor(SUBINK).font('Helvetica').fontSize(7.5)
    .text('Solid wire = main path   ·   dashed = agent capability (model / memory / tool)   ·   true/false = routing',
      M, PAGE.h - 22, { width: PAGE.w - M * 2 - 120, align: 'left', lineBreak: false });
  doc.fillColor(SUBINK).font('Helvetica-Bold').fontSize(7.5)
    .text(`${PAGE_TITLES[i] || ''}   ·   ${i} / ${range.count - 1}`, M, PAGE.h - 22, { width: PAGE.w - M * 2, align: 'right', lineBreak: false });
}

doc.end();
console.log('Wrote', outPath, '·', range.count, 'pages');
