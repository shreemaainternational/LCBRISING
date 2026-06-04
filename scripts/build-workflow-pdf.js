/**
 * Builds the LCBRS "System Workflow Blueprint" — a single PDF that maps the
 * entire platform: the public Website, the Admin/CRM portal, and the Mobile
 * PWA, together with every integration and configuration, wired and linked.
 *
 * Usage:
 *   node scripts/build-workflow-pdf.js [out.pdf]
 *
 * Output (default): public/lcbrs-workflow-blueprint.pdf
 * This path is downloadable in-app from /admin/workflow.
 *
 * Pure pdfkit — no external services, deterministic, safe to run in CI.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ---- palette (matches the club brand) -------------------------------------
const NAVY = '#0B1F4D';
const NAVY2 = '#1e3a8a';
const GOLD = '#c99700';
const GOLD_BRIGHT = '#fbbf24';
const INK = '#1f2937';
const MUTE = '#6b7280';
const LINE = '#e5e7eb';
const PANEL = '#f8fafc';
const WHITE = '#ffffff';

// category accent colours (mirror /admin/integrations)
const CAT = {
  identity:  '#2563eb',
  database:  '#0891b2',
  payments:  '#d97706',
  messaging: '#059669',
  ai:        '#7c3aed',
  social:    '#db2777',
  media:     '#e11d48',
  platform:  '#475569',
};

const CLUB = 'LIONS CLUB OF BARODA RISING STAR';
const SUB = 'Club No. 179323   |   District 3232 F1   |   Region 6   |   Zone 1   |   Vadodara, India';
const YEAR = 'Lions Year 2025 - 2026';

const args = process.argv.slice(2);
const outPath = args[0] || path.join(__dirname, '..', 'public', 'lcbrs-workflow-blueprint.pdf');
const logoPath = path.join(__dirname, '..', 'public', 'logo.png');

// ---- page geometry ---------------------------------------------------------
const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const M = 44; // margin
const CW = PAGE.w - M * 2; // content width

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: M, bottom: 0, left: M, right: M },
  bufferPages: true,
});
doc.pipe(fs.createWriteStream(outPath));

// Page layout is managed manually via ensure()/newPage(); disable pdfkit's
// automatic "overflow -> new page" behaviour so no blank pages sneak in when
// absolutely-positioned text sits near the bottom edge.
doc.on('pageAdded', () => { doc.page.margins.bottom = 0; });

// ===========================================================================
// helpers
// ===========================================================================
function hasLogo() {
  try { return fs.existsSync(logoPath); } catch { return false; }
}

let pageHasChrome = false;

function chrome(title) {
  // top rule + section label, drawn after addPage
  doc.save();
  doc.rect(0, 0, PAGE.w, 6).fill(GOLD_BRIGHT);
  doc.fillColor(MUTE).font('Helvetica').fontSize(8)
    .text(CLUB, M, 18, { width: CW - 120, align: 'left' });
  doc.fillColor(MUTE).font('Helvetica').fontSize(8)
    .text(title, M, 18, { width: CW, align: 'right' });
  doc.moveTo(M, 34).lineTo(PAGE.w - M, 34).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.restore();
  pageHasChrome = true;
}

function footer() {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    if (i === 0) continue; // skip cover
    doc.save();
    doc.fillColor(MUTE).font('Helvetica').fontSize(7.5)
      .text(`${YEAR}  ·  System Workflow Blueprint`, M, PAGE.h - 28, { width: CW - 60, align: 'left', lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, M, PAGE.h - 28, { width: CW, align: 'right', lineBreak: false });
    doc.restore();
  }
}

function newPage(title) {
  doc.addPage();
  chrome(title);
  doc.y = 50;
  doc.x = M;
}

// vertical-cursor space guard
function ensure(space) {
  if (doc.y + space > PAGE.h - 44) {
    const t = currentTitle;
    newPage(t);
  }
}
let currentTitle = '';

function h1(text, sub) {
  ensure(60);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text(text, M, doc.y);
  if (sub) {
    doc.moveDown(0.15);
    doc.fillColor(MUTE).font('Helvetica').fontSize(9.5).text(sub, { width: CW });
  }
  doc.moveDown(0.4);
  const y = doc.y;
  doc.moveTo(M, y).lineTo(M + 60, y).lineWidth(3).strokeColor(GOLD_BRIGHT).stroke();
  doc.moveDown(0.6);
}

function h2(text, color = NAVY2) {
  ensure(40);
  doc.moveDown(0.3);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(12.5).text(text, M, doc.y);
  doc.moveDown(0.3);
}

function para(text) {
  ensure(30);
  doc.fillColor(INK).font('Helvetica').fontSize(9.5).text(text, M, doc.y, { width: CW, lineGap: 2 });
  doc.moveDown(0.4);
}

function bullets(items, opts = {}) {
  const color = opts.color || INK;
  const indent = opts.indent || 0;
  doc.font('Helvetica').fontSize(9.5);
  for (const it of items) {
    ensure(16);
    const x = M + 6 + indent;
    const w = CW - 12 - indent;
    const startY = doc.y;
    doc.fillColor(GOLD).text('•', x, startY, { width: 8 });
    doc.fillColor(color).text(it, x + 10, startY, { width: w - 10, lineGap: 1.5 });
    doc.moveDown(0.15);
  }
  doc.moveDown(0.2);
}

// labelled chip
function chip(label, x, y, color) {
  doc.font('Helvetica-Bold').fontSize(7);
  const w = doc.widthOfString(label) + 10;
  doc.roundedRect(x, y, w, 13, 3).fill(color);
  doc.fillColor(WHITE).text(label, x + 5, y + 3);
  return w;
}

// ---- diagram primitives ----------------------------------------------------
function box(x, y, w, h, opts = {}) {
  const r = opts.r != null ? opts.r : 6;
  const fill = opts.fill || WHITE;
  const stroke = opts.stroke || LINE;
  doc.save();
  if (opts.shadow) {
    doc.roundedRect(x + 1.5, y + 2, w, h, r).fill('#0000000d');
  }
  doc.roundedRect(x, y, w, h, r).lineWidth(opts.lw || 1).fillAndStroke(fill, stroke);
  if (opts.accent) {
    doc.roundedRect(x, y, w, 4, r).fill(opts.accent);
    doc.rect(x, y + 2, w, 2).fill(opts.accent);
  }
  // title
  if (opts.title) {
    doc.fillColor(opts.titleColor || NAVY).font('Helvetica-Bold').fontSize(opts.titleSize || 9.5)
      .text(opts.title, x + 8, y + (opts.accent ? 10 : 7), { width: w - 16, align: opts.align || 'left' });
  }
  // lines
  if (opts.lines) {
    let ly = y + (opts.accent ? 26 : 23);
    doc.font('Helvetica').fontSize(opts.lineSize || 7.5).fillColor(opts.lineColor || MUTE);
    for (const l of opts.lines) {
      doc.text(l, x + 8, ly, { width: w - 16, align: opts.align || 'left' });
      ly += (opts.lineSize || 7.5) + 2.5;
    }
  }
  doc.restore();
}

function connect(x1, y1, x2, y2, color = NAVY2, opts = {}) {
  doc.save();
  doc.lineWidth(opts.lw || 1).strokeColor(color);
  if (opts.dash) doc.dash(2, { space: 2 });
  doc.moveTo(x1, y1);
  if (opts.elbow) {
    const my = (y1 + y2) / 2;
    doc.lineTo(x1, my).lineTo(x2, my).lineTo(x2, y2);
  } else {
    doc.lineTo(x2, y2);
  }
  doc.stroke();
  doc.undash();
  // arrowhead at end (pointing down by default)
  if (opts.arrow !== false) {
    const a = 3.2;
    if (opts.dir === 'right') {
      doc.moveTo(x2, y2).lineTo(x2 - a, y2 - a).lineTo(x2 - a, y2 + a).fill(color);
    } else if (opts.dir === 'up') {
      doc.moveTo(x2, y2).lineTo(x2 - a, y2 + a).lineTo(x2 + a, y2 + a).fill(color);
    } else {
      doc.moveTo(x2, y2).lineTo(x2 - a, y2 - a).lineTo(x2 + a, y2 - a).fill(color);
    }
  }
  doc.restore();
}

// ===========================================================================
// DATA — single source for the document
// ===========================================================================
const integrations = [
  { cat: 'identity', name: 'Supabase Auth', desc: 'Email sign-in for admins & members; backs /login and the member portal.', env: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'], missing: 'Sign-in, portal and all CRM pages unavailable.' },
  { cat: 'identity', name: 'Supabase Service Role', desc: 'Server-only admin client for cron, sync, reports & webhooks (bypasses RLS).', env: ['SUPABASE_SERVICE_ROLE_KEY'], missing: 'Cron, OIDC provisioning and sync paths degrade.' },
  { cat: 'identity', name: 'Lions International SSO (OIDC)', desc: 'PKCE + JWKS + discovery, role mapping, MyLCI claims. Configure in-app or via env.', env: ['LIONS_OIDC_ISSUER', 'LIONS_OIDC_CLIENT_ID', 'LIONS_OIDC_REDIRECT_URI', 'LIONS_OIDC_CLIENT_SECRET?', 'LIONS_OIDC_SCOPES?'], missing: '"Sign in with Lions" button hidden.' },
  { cat: 'identity', name: 'Lions International REST API', desc: 'MyLCI-shape adapter syncing districts, clubs & members. Dry-run when unset.', env: ['LIONS_API_BASE_URL', 'LIONS_API_KEY?', 'LIONS_API_ACCESS_TOKEN?', 'LIONS_API_DISTRICT_CODE?'], missing: 'Sync runs dry-run, zeroed counts.' },
  { cat: 'database', name: 'Supabase Postgres + Storage', desc: 'Primary datastore with Row-Level-Security on every table; media buckets.', env: ['SUPABASE_PROJECT_ID', 'NEXT_PUBLIC_SUPABASE_URL'], missing: 'Platform cannot persist or read data.' },
  { cat: 'payments', name: 'Razorpay', desc: 'Card / netbanking / UPI hosted checkout, refunds, recurring invoices, webhook reconciliation.', env: ['RAZORPAY_KEY_ID', 'RAZORPAY_SECRET', 'RAZORPAY_WEBHOOK_SECRET?', 'NEXT_PUBLIC_RAZORPAY_KEY_ID?'], missing: 'Hosted checkout disabled; UPI deep-links still work.' },
  { cat: 'payments', name: 'PhonePe', desc: 'PhonePe Standard Checkout for UPI-first flows with webhook auto-verification.', env: ['PHONEPE_MERCHANT_ID', 'PHONEPE_SALT_KEY', 'PHONEPE_SALT_INDEX?'], missing: 'PhonePe-hosted checkout button hidden.' },
  { cat: 'payments', name: 'UPI Deep-links + QR', desc: 'PhonePe / GPay / Paytm intent URLs and dynamic UPI QR on /pay/[id].', env: ['UPI_VPA', 'UPI_PAYEE_NAME?', 'NEXT_PUBLIC_UPI_VPA?'], missing: 'UPI QR & deep-link buttons hidden.' },
  { cat: 'messaging', name: 'Resend (Email)', desc: 'Transactional email — receipts, payment confirmations, OTP, portal links.', env: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL?'], missing: 'Receipts, OTP and payment email not delivered.' },
  { cat: 'messaging', name: 'Twilio (SMS / WhatsApp)', desc: 'SMS and WhatsApp Business via Twilio sandbox / approved sender.', env: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM?'], missing: 'Outbound SMS / Twilio WhatsApp stop.' },
  { cat: 'messaging', name: 'WhatsApp Business Cloud', desc: 'Meta WhatsApp Cloud API — preferred for outbound notifications & templates.', env: ['WHATSAPP_BUSINESS_TOKEN', 'WHATSAPP_BUSINESS_PHONE_ID'], missing: 'Falls back to Twilio WhatsApp or none.' },
  { cat: 'messaging', name: 'Web Push (VAPID)', desc: 'PWA push — broadcast / topic / per-member. Keypair auto-generated on install.', env: ['VAPID_PUBLIC_KEY?', 'VAPID_PRIVATE_KEY?', 'VAPID_SUBJECT?'], missing: 'Push broadcast disabled; mobile toggle inert.' },
  { cat: 'ai', name: 'OpenAI (Chat + Vision)', desc: 'Narrative writer (EN+GU), greetings, creative builder, club insights, dedupe, UPI/expense OCR.', env: ['OPENAI_API_KEY?', 'OPENAI_MODEL?'], missing: 'AI falls back to hand-written templates.' },
  { cat: 'social', name: 'Meta — Facebook Pages', desc: 'Auto-post to the club Facebook Page with images & captions.', env: ['META_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID', 'META_APP_ID?'], missing: 'Facebook posting disabled.' },
  { cat: 'social', name: 'Meta — Instagram Business', desc: 'Auto-post to the club Instagram Business account.', env: ['META_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ID'], missing: 'Instagram posting disabled.' },
  { cat: 'social', name: 'LinkedIn Organization', desc: 'Auto-post to the club LinkedIn organization page.', env: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORGANIZATION_URN', 'LINKEDIN_CLIENT_ID?'], missing: 'LinkedIn posting disabled.' },
  { cat: 'media', name: 'Canva Connect', desc: 'Canva Connect API for branded creatives / event posters.', env: ['CANVA_CLIENT_ID?', 'CANVA_CLIENT_SECRET?', 'CANVA_API_KEY?'], missing: 'Canva creative actions degrade.' },
  { cat: 'media', name: 'Cloudinary', desc: 'Hosted media CDN for activity photos, before/after galleries, event covers.', env: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], missing: 'Photos fall back to Supabase Storage.' },
  { cat: 'platform', name: 'Vercel Cron', desc: 'Scheduled automation + monthly/quarterly/half-yearly/yearly reports. Secret auto-provisioned.', env: ['CRON_SECRET?'], missing: 'Scheduled jobs return 401 on Vercel.' },
  { cat: 'platform', name: 'PWA Shell', desc: 'Mobile app at /m — installable icon, offline shell cache, push notifications.', env: ['(baked into build)'], missing: 'Always on.' },
];

const catLabel = {
  identity: 'Identity & Access', database: 'Database', payments: 'Payments',
  messaging: 'Messaging', ai: 'Artificial Intelligence', social: 'Social',
  media: 'Media', platform: 'Platform',
};

// ===========================================================================
// PAGE 1 — COVER
// ===========================================================================
function cover() {
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(NAVY);
  // gold band
  doc.rect(0, 0, PAGE.w, 10).fill(GOLD_BRIGHT);
  // subtle corner motif
  doc.save();
  doc.opacity(0.06);
  doc.circle(PAGE.w - 40, 120, 180).fill(GOLD_BRIGHT);
  doc.circle(20, PAGE.h - 60, 150).fill(WHITE);
  doc.opacity(1).restore();

  let y = 150;
  if (hasLogo()) {
    try { doc.image(logoPath, PAGE.w / 2 - 40, y, { width: 80, height: 80 }); y += 96; } catch { y += 10; }
  }
  doc.fillColor(GOLD_BRIGHT).font('Helvetica-Bold').fontSize(11)
    .text(CLUB, M, y, { width: CW, align: 'center', characterSpacing: 1.5 });
  y += 22;
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8.5)
    .text(SUB, M, y, { width: CW, align: 'center' });
  y += 60;

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(34)
    .text('System Workflow', M, y, { width: CW, align: 'center' });
  doc.text('Blueprint', { width: CW, align: 'center' });
  y = doc.y + 14;
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(12)
    .text('CRM  ·  Mobile App  ·  Website — every integration & configuration, wired together',
      M, y, { width: CW, align: 'center' });

  // three pillars
  y += 60;
  const pw = (CW - 24) / 3;
  const pillars = [
    ['PUBLIC WEBSITE', 'Marketing, donations,\ninvoices & member portal', GOLD_BRIGHT],
    ['ADMIN / CRM', '27 modules: members, clubs,\ndistricts, payments, sync', WHITE],
    ['MOBILE APP (PWA)', 'Field tools: check-in, activity\nlogging, beneficiaries, push', GOLD_BRIGHT],
  ];
  pillars.forEach((p, i) => {
    const x = M + i * (pw + 12);
    doc.roundedRect(x, y, pw, 90, 8).lineWidth(1).fillAndStroke('#13284f', '#23477f');
    doc.fillColor(p[2]).font('Helvetica-Bold').fontSize(10).text(p[0], x + 8, y + 14, { width: pw - 16, align: 'center' });
    doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8).text(p[1], x + 8, y + 38, { width: pw - 16, align: 'center' });
  });

  // footer meta
  const today = new Date().toISOString().slice(0, 10);
  doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
    .text(`Generated ${today}   ·   ${integrations.length} integrations across 8 categories   ·   Next.js 16 · Supabase · Vercel`,
      M, PAGE.h - 70, { width: CW, align: 'center', lineBreak: false });
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9)
    .text(YEAR, M, PAGE.h - 52, { width: CW, align: 'center', lineBreak: false });
}

// ===========================================================================
// PAGE 2 — ARCHITECTURE DIAGRAM (the wired overview)
// ===========================================================================
function architecture() {
  newPage('Architecture');
  currentTitle = 'Architecture';
  h1('System Architecture — wired overview',
    'Three user surfaces converge on one Next.js API layer and a single Supabase core, which fans out to every external integration.');

  const top = doc.y + 4;

  // ---- ROW 1: three surfaces ----
  const surfW = (CW - 2 * 16) / 3;
  const surfH = 56;
  const surfaces = [
    { t: 'Public Website', l: ['Marketing · Donate', 'Invoices · /pay/[id]', 'Member Portal (OTP)'], a: GOLD },
    { t: 'Admin / CRM Portal', l: ['27 modules', 'Members · Clubs', 'Payments · Reports'], a: NAVY2 },
    { t: 'Mobile App (PWA)', l: ['/m field tools', 'Check-in · Activities', 'Push notifications'], a: CAT.platform },
  ];
  const surfX = [];
  surfaces.forEach((s, i) => {
    const x = M + i * (surfW + 16);
    surfX.push(x + surfW / 2);
    box(x, top, surfW, surfH, { fill: PANEL, accent: s.a, title: s.t, lines: s.l, shadow: true });
  });

  // ---- ROW 2: API / middleware layer ----
  const apiY = top + surfH + 28;
  const apiH = 36;
  box(M, apiY, CW, apiH, { fill: '#eef2ff', stroke: '#c7d2fe', title: 'Next.js 16 App Router — API routes · middleware · RBAC guards · Zod validation · rate-limit',
    titleColor: NAVY, titleSize: 9, align: 'center' });
  // connect surfaces -> api
  surfX.forEach((cx) => connect(cx, top + surfH, cx, apiY, NAVY2, { lw: 1 }));

  // ---- ROW 3: Supabase core ----
  const coreY = apiY + apiH + 26;
  const coreH = 50;
  box(M, coreY, CW, coreH, { fill: '#ecfeff', stroke: '#a5f3fc',
    title: 'Supabase Core — Postgres (Row-Level Security) · Auth · Storage · 55 migrations',
    titleColor: '#0e7490', titleSize: 9.5, align: 'center',
    lines: ['members · clubs · districts · zones · officers · dues · donations · payments · invoices · activities · events · beneficiaries · reports · audit_logs · sync_logs · automation_jobs'] });
  doc.fontSize(7.5);
  connect(M + CW / 2, apiY + apiH, M + CW / 2, coreY, '#0891b2', { lw: 1.2 });

  // ---- ROW 4: integration clusters ----
  const intY = coreY + coreH + 26;
  const clusters = [
    { t: 'Payments', a: CAT.payments, l: ['Razorpay', 'PhonePe', 'UPI / QR'] },
    { t: 'Messaging', a: CAT.messaging, l: ['Resend', 'Twilio', 'WhatsApp', 'Web Push'] },
    { t: 'Identity', a: CAT.identity, l: ['Lions OIDC', 'Lions REST'] },
    { t: 'AI & Media', a: CAT.ai, l: ['OpenAI', 'Cloudinary', 'Canva'] },
    { t: 'Social', a: CAT.social, l: ['Facebook', 'Instagram', 'LinkedIn'] },
    { t: 'Platform', a: CAT.platform, l: ['Vercel Cron', 'PWA Shell'] },
  ];
  const perRow = 3;
  const cgap = 14;
  const cw = (CW - (perRow - 1) * cgap) / perRow;
  const ch = 60;
  clusters.forEach((c, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = M + col * (cw + cgap);
    const y = intY + row * (ch + 16);
    box(x, y, cw, ch, { fill: WHITE, accent: c.a, title: c.t, lines: c.l, shadow: true, lineSize: 7.5 });
    // connect core -> cluster (only top row visually from core bottom)
    if (row === 0) {
      const cx = x + cw / 2;
      connect(cx, coreY + coreH, cx, y, c.a, { lw: 0.9, dash: true });
    }
  });
  // link second row up to first row centrally
  const secondRowY = intY + (ch + 16);
  connect(M + CW / 2, coreY + coreH, M + CW / 2, secondRowY, MUTE, { lw: 0.8, dash: true, elbow: false });

  doc.y = secondRowY + ch + 20;

  // legend / flow note
  ensure(70);
  box(M, doc.y, CW, 56, { fill: '#fffbeb', stroke: '#fde68a' });
  const ly = doc.y + 8;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(9).text('How to read this', M + 10, ly);
  doc.fillColor(INK).font('Helvetica').fontSize(8).text(
    'Solid arrows = synchronous request path (browser -> API -> database). Dashed arrows = the database/automation layer reaching out to external providers (webhooks, cron-driven jobs, AI calls). Every integration degrades gracefully when unconfigured — the feature it powers simply hides.',
    M + 10, ly + 14, { width: CW - 20, lineGap: 1.5 });
}

// ===========================================================================
// PAGE 3 — THE THREE SURFACES
// ===========================================================================
function surfaces() {
  newPage('Surfaces');
  currentTitle = 'Surfaces';
  h1('The three surfaces', 'One codebase, one database — served as a website, an admin CRM, and a mobile PWA.');

  h2('1 · Public Website', GOLD);
  para('Server-rendered, SEO-optimised marketing site and supporter-facing flows. Routes under (public).');
  bullets([
    'Marketing: Home, About, Activities, Events, Impact, Campaigns, Media, Stories, Blog.',
    'Giving: /donate (Razorpay + UPI), /pay/[id] one-tap invoice payment with dynamic UPI QR.',
    'Invoices: /invoices/lookup self-service receipt & invoice lookup.',
    'Member Portal: /portal OTP login, communication preferences, logout.',
    'Trust: /privacy, /terms, contact form (rate-limited, stored to DB).',
  ]);

  h2('2 · Admin / CRM Portal', NAVY2);
  para('Auth-gated control plane under /admin (27 modules). RBAC-scoped; every privileged action is audited.');
  const mods = [
    'Dashboard', 'Command Center', 'Diagnostics', 'Reports', 'Beneficiaries', 'Districts',
    'Zones', 'Clubs', 'Members', 'Dues', 'Donations', 'Payments / QR', 'Activities', 'Events',
    'Newsroom', 'Media', 'Creative', 'Social', 'Comms', 'Push', 'Automation', 'Sync',
    'Governance', 'Integrations', 'Audit log', 'Profile', 'Workflow (this map)',
  ];
  // render modules as wrapped chips
  let cx = M + 6, cy = doc.y;
  doc.fontSize(7.5).font('Helvetica-Bold');
  for (const m of mods) {
    const w = doc.widthOfString(m) + 14;
    if (cx + w > PAGE.w - M) { cx = M + 6; cy += 18; ensure(20); cy = Math.min(cy, doc.y + 0); }
    doc.roundedRect(cx, cy, w, 14, 7).fillAndStroke('#eef2ff', '#c7d2fe');
    doc.fillColor(NAVY2).text(m, cx + 7, cy + 3.5);
    cx += w + 6;
  }
  doc.y = cy + 24;

  h2('3 · Mobile App — PWA', CAT.platform);
  para('Installable progressive web app at /m with offline shell, home-screen icon and push. Built for Lions in the field.');
  bullets([
    'Home dashboard + bottom tab bar; service worker caches the app shell.',
    'QR check-in scanner for event attendance; activity logging with photo upload + AI narrative.',
    'Beneficiary intake, member & club directory, reports, AI greetings composer, networking.',
    'Push toggle (VAPID) for broadcast / per-member notifications.',
    'App shortcuts: Log activity · QR check-in · Add beneficiary · Reports.',
  ]);
}

// ===========================================================================
// PAGE 4+ — INTEGRATION REGISTRY
// ===========================================================================
function registry() {
  newPage('Integrations');
  currentTitle = 'Integrations';
  h1('Integration & configuration registry',
    `Every external service the platform talks to (${integrations.length} total), the environment keys that wire it, and what breaks when it is missing.`);

  const order = ['identity', 'database', 'payments', 'messaging', 'ai', 'social', 'media', 'platform'];
  for (const cat of order) {
    const items = integrations.filter((i) => i.cat === cat);
    if (!items.length) continue;
    ensure(40);
    // category header
    doc.moveDown(0.2);
    const hy = doc.y;
    doc.roundedRect(M, hy, 4, 16, 2).fill(CAT[cat]);
    doc.fillColor(CAT[cat]).font('Helvetica-Bold').fontSize(11)
      .text(`${catLabel[cat]}`, M + 12, hy + 1);
    doc.fillColor(MUTE).font('Helvetica').fontSize(8)
      .text(`${items.length} service${items.length === 1 ? '' : 's'}`, M + 12, hy + 1, { width: CW - 12, align: 'right' });
    doc.y = hy + 22;

    for (const it of items) {
      // estimate height
      ensure(58);
      const x = M, y = doc.y;
      const bw = CW;
      // card
      doc.save();
      doc.roundedRect(x, y, bw, 50, 5).lineWidth(0.8).fillAndStroke(WHITE, LINE);
      doc.roundedRect(x, y, 3, 50, 1).fill(CAT[cat]);
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(it.name, x + 12, y + 7, { width: bw - 24 });
      doc.fillColor(INK).font('Helvetica').fontSize(8).text(it.desc, x + 12, y + 20, { width: bw - 24, lineGap: 1 });
      // env chips
      let exx = x + 12, exy = y + 38;
      doc.font('Helvetica').fontSize(6.5);
      doc.fillColor(MUTE).text('KEYS:', exx, exy + 1);
      exx += 26;
      for (const e of it.env) {
        const optional = e.endsWith('?');
        const label = optional ? e.slice(0, -1) : e;
        const w = doc.widthOfString(label) + 8;
        if (exx + w > x + bw - 12) break;
        doc.roundedRect(exx, exy - 1, w, 9, 2).fillAndStroke(optional ? '#f1f5f9' : '#fef2f2', optional ? '#e2e8f0' : '#fecaca');
        doc.fillColor(optional ? MUTE : '#b91c1c').font('Courier').fontSize(6).text(label, exx + 4, exy + 1);
        exx += w + 4;
      }
      doc.restore();
      doc.y = y + 56;
    }
  }

  // impact appendix note
  ensure(40);
  para('Required keys are shown in red, optional in grey (suffix removed). Identity / Lions services and OpenAI, Web Push and Cron can also be configured in-app — their secrets are stored encrypted (AES-256-GCM) in the database and take precedence rules described under Security.');
}

// ===========================================================================
// PAGE — KEY DATA FLOWS
// ===========================================================================
function flowStep(steps, accent) {
  // vertical numbered steps
  doc.fontSize(8.5);
  steps.forEach((s, i) => {
    ensure(20);
    const y = doc.y;
    doc.circle(M + 8, y + 6, 7).fill(accent);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text(String(i + 1), M + 4.5, y + 2.6, { width: 8, align: 'left' });
    doc.fillColor(INK).font('Helvetica').fontSize(8.5).text(s, M + 24, y, { width: CW - 28, lineGap: 1 });
    const endY = doc.y;
    if (i < steps.length - 1) {
      doc.moveTo(M + 8, y + 13).lineTo(M + 8, endY + 2).lineWidth(1).strokeColor(accent).stroke();
    }
    doc.moveDown(0.35);
  });
  doc.moveDown(0.3);
}

function flows() {
  newPage('Data flows');
  currentTitle = 'Data flows';
  h1('Key data flows', 'The wired sequences that connect surfaces, the API, the database and external providers.');

  h2('Donation / invoice payment', CAT.payments);
  flowStep([
    'Browser POSTs /api/donations/intent (or /pay/[id]) -> creates donation + payment rows, returns a Razorpay order (or renders a UPI QR / PhonePe checkout).',
    'Supporter pays in the hosted checkout or their UPI app.',
    'POST /api/donations/verify checks the signature, marks the payment captured, sets dues/invoice paid, enqueues a receipt job.',
    'Webhook /api/webhooks/razorpay (HMAC-verified) and /api/webhooks/phonepe back up the client flow for captured / failed events.',
    'Automation engine renders the 80G-style PDF receipt and emails (Resend) + WhatsApps it to the donor.',
  ], CAT.payments);

  h2('Lions SSO login -> member upsert', CAT.identity);
  flowStep([
    '/api/auth/oidc/login generates PKCE + state + nonce, redirects to the Lions IdP.',
    'IdP returns code to /api/auth/oidc/callback -> verifies state, exchanges code for tokens (PKCE), verifies the ID token via JWKS.',
    'fetchUserInfo() -> upsert oauth_accounts (linked by lions_member_id then email), promotes role claims onto members.',
    'createSession() sets a signed session cookie; writeAudit("oauth.login"); redirect -> /admin.',
  ], CAT.identity);

  h2('Sync engine (CSV · REST · webhook)', CAT.identity);
  flowStep([
    'Officer (RBAC sync.trigger) uploads a CSV or triggers a REST pull; or the Lions provider POSTs a signed payload to /api/webhooks/lions.',
    'runSyncJob() opens a sync_logs row (running); the entity adapter validates each row with Zod.',
    'Valid rows upsert members / clubs / districts; failures are captured with reasons; a paginated cursor is persisted for REST.',
    'sync_logs is finalised with counts; writeAudit(sync.success | partial | failed). The sync-worker cron drains the queue daily.',
  ], CAT.identity);

  h2('Automation, cron & notifications', CAT.messaging);
  flowStep([
    'Events (new member, captured donation, officer appointment, dues due) enqueue rows in automation_jobs.',
    'Vercel Cron hits /api/cron/automation (Bearer CRON_SECRET) on schedule; the engine claims and runs handlers.',
    'Handlers send email (Resend), WhatsApp (Twilio / Meta Cloud), SMS, and Web Push; each writes a comms log.',
    'Report crons generate monthly / quarterly / half-yearly / yearly PDFs; action-item, donor-pack and sync-worker crons follow.',
  ], CAT.messaging);

  h2('AI & OCR assist', CAT.ai);
  flowStep([
    'Activity narrative (EN+GU), AI greetings, creative copy, and club insights call OpenAI via /api/ai/*.',
    'UPI payment proof and expense bills are OCR\'d (/api/ai/ocr) to auto-fill amounts and reconcile.',
    'When no OpenAI key is present, every feature falls back to deterministic hand-written templates.',
  ], CAT.ai);
}

// ===========================================================================
// PAGE — AUTOMATION SCHEDULE + SECURITY + DB
// ===========================================================================
function opsAndSecurity() {
  newPage('Operations & security');
  currentTitle = 'Operations & security';
  h1('Automation schedule, data model & security');

  h2('Vercel Cron schedule', CAT.platform);
  const crons = [
    ['Daily 03:00', '/api/cron/automation?schedule=1', 'Drives the automation engine — reminders, receipts, notifications.'],
    ['Monthly 1st 04:00', '/api/cron/reports?type=monthly', 'Generates the monthly activity & finance report PDF.'],
    ['Quarterly 1st 05:00', '/api/cron/reports?type=quarterly', 'Quarterly consolidated report.'],
    ['Half-yearly 1st 06:00', '/api/cron/reports?type=half_yearly', 'Half-yearly consolidated report.'],
    ['Yearly Jul 1 07:00', '/api/cron/reports?type=yearly', 'Annual report aligned to the Lions year.'],
    ['Daily 08:00', '/api/cron/action-items', 'Surfaces & reminds outstanding zone action items.'],
    ['Apr 1-7 09:00', '/api/cron/donor-pack', 'Builds annual donor appreciation packs.'],
    ['Daily 10:00', '/api/cron/sync-worker', 'Drains the sync queue against Lions REST.'],
  ];
  // table
  const colX = [M, M + 95, M + 300];
  ensure(20);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY);
  doc.text('SCHEDULE', colX[0], doc.y, { width: 90 });
  doc.text('ENDPOINT', colX[1], doc.y - doc.currentLineHeight(), { width: 200 });
  doc.text('PURPOSE', colX[2], doc.y - doc.currentLineHeight(), { width: PAGE.w - M - colX[2] });
  doc.moveDown(0.2);
  doc.moveTo(M, doc.y).lineTo(PAGE.w - M, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.moveDown(0.25);
  for (const [s, e, p] of crons) {
    ensure(22);
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(CAT.platform).text(s, colX[0], y, { width: 90 });
    doc.font('Courier').fontSize(7).fillColor(INK).text(e, colX[1], y, { width: 200 });
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTE).text(p, colX[2], y, { width: PAGE.w - M - colX[2] });
    doc.y = Math.max(doc.y, y) + 4;
    doc.moveTo(M, doc.y - 1).lineTo(PAGE.w - M, doc.y - 1).lineWidth(0.25).strokeColor('#f1f5f9').stroke();
  }
  doc.moveDown(0.4);

  h2('Data model — 55 migrations', CAT.database);
  para('Postgres schema evolves through ordered migrations (0001 -> 0055). Highlights:');
  bullets([
    'Core CRM (0001), social/creative (0002), enterprise federation hierarchy + auth + audit + sync (0003).',
    'Payments stack: invoices (0010), refunds (0011), portal OTP (0012), recurring invoices (0013), agent commissions (0015).',
    'Reporting engine (0020), push subscriptions (0021), media buckets (0023), zone agenda/minutes/calendar (0026–0028).',
    'Lions OIDC + REST + sandbox settings (0030–0033), cron settings (0034), governance & district governor (0035–0036).',
    'Federation RLS (0037), three-tier dues (0040), district sync circulars (0041), advisory voting (0046), sync queue (0048).',
    'Public site tables (0051), blog storytelling (0052), Lions webhook & sync meta (0053), district code 3232 F1 (0054).',
  ]);

  h2('Security & compliance posture', CAT.identity);
  bullets([
    'Row-Level Security on every table; service-role key is server-only and never bundled to the browser.',
    'Secrets read through a Zod env schema; in-app secrets (OIDC, Lions API, OpenAI, VAPID, Cron) wrapped with AES-256-GCM at rest.',
    'OIDC code flow protected by state + PKCE + nonce; ID tokens verified against the provider JWKS.',
    'Razorpay & PhonePe webhooks HMAC-verified; Lions inbound webhook signed with a shared HMAC-SHA256 secret.',
    'Public POST endpoints rate-limited; append-only audit_logs capture every privileged action; RBAC denials recorded.',
    'Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) set in vercel.json.',
    'No scraping — all Lions data ingested via OIDC userinfo, official REST APIs, or human-uploaded CSV/Excel.',
  ]);

  // closing
  ensure(46);
  box(M, doc.y, CW, 38, { fill: NAVY });
  const yy = doc.y;
  doc.fillColor(GOLD_BRIGHT).font('Helvetica-Bold').fontSize(9).text('Live view', M + 12, yy + 8);
  doc.fillColor(WHITE).font('Helvetica').fontSize(8.5).text(
    'This blueprint is mirrored in-app at /admin/workflow, and live integration health is at /admin/integrations.',
    M + 12, yy + 20, { width: CW - 24 });
}

// ===========================================================================
// build
// ===========================================================================
cover();
architecture();
surfaces();
registry();
flows();
opsAndSecurity();
footer();

doc.end();
console.log('Wrote', outPath);
