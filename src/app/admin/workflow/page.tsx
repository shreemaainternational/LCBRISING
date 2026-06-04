import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getIntegrationRegistry,
  summarizeIntegrations,
  type IntegrationCategory,
  type IntegrationDescriptor,
} from '@/lib/integrations-registry';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadCronSecret } from '@/lib/cron-auth';
import { loadVapidConfig } from '@/lib/push-config';
import { loadOpenAiConfig } from '@/lib/ai/openai-config';
import {
  Workflow as WorkflowIcon, Download, Globe, ShieldCheck, Smartphone,
  Server, Database, CheckCircle2, XCircle, ArrowDown, CreditCard,
  MessageSquare, Lock, Brain, Share2, Image as ImageIcon, Clock, Plug,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PDF_HREF = '/lcbrs-workflow-blueprint.pdf';

const CATEGORY_META: Record<IntegrationCategory, { label: string; icon: React.ComponentType<{ size?: number }>; dot: string; chip: string }> = {
  identity:  { label: 'Identity & Access', icon: Lock,          dot: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700' },
  database:  { label: 'Database',          icon: Database,      dot: 'bg-cyan-500',   chip: 'bg-cyan-100 text-cyan-700' },
  payments:  { label: 'Payments',          icon: CreditCard,    dot: 'bg-amber-500',  chip: 'bg-amber-100 text-amber-700' },
  messaging: { label: 'Messaging',         icon: MessageSquare, dot: 'bg-emerald-500',chip: 'bg-emerald-100 text-emerald-700' },
  ai:        { label: 'AI',                icon: Brain,         dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  social:    { label: 'Social',            icon: Share2,        dot: 'bg-pink-500',   chip: 'bg-pink-100 text-pink-700' },
  media:     { label: 'Media',             icon: ImageIcon,     dot: 'bg-rose-500',   chip: 'bg-rose-100 text-rose-700' },
  platform:  { label: 'Platform',          icon: Server,        dot: 'bg-slate-500',  chip: 'bg-slate-100 text-slate-700' },
};

const CATEGORY_ORDER: IntegrationCategory[] = [
  'identity', 'database', 'payments', 'messaging', 'ai', 'social', 'media', 'platform',
];

const SURFACES = [
  {
    name: 'Public Website',
    icon: Globe,
    accent: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    blurb: 'Server-rendered marketing site + supporter flows.',
    items: ['Home · About · Activities · Events · Impact', 'Campaigns · Media · Stories · Blog', 'Donate (Razorpay + UPI) · /pay/[id]', 'Invoice lookup · Member portal (OTP)', 'Privacy · Terms · Contact'],
  },
  {
    name: 'Admin / CRM Portal',
    icon: ShieldCheck,
    accent: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    blurb: 'Auth-gated control plane — 27 modules, RBAC-scoped, fully audited.',
    items: ['Members · Clubs · Districts · Zones', 'Dues · Donations · Payments / QR', 'Activities · Events · Beneficiaries', 'Reports · Automation · Sync · Governance', 'Social · Creative · Comms · Push · Integrations'],
  },
  {
    name: 'Mobile App (PWA)',
    icon: Smartphone,
    accent: 'border-slate-500',
    badge: 'bg-slate-100 text-slate-700',
    blurb: 'Installable field tool at /m — offline shell + push.',
    items: ['QR check-in scanner', 'Activity logging + photo + AI narrative', 'Beneficiary intake · Directory', 'Reports · AI greetings · Networking', 'Push toggle (VAPID)'],
  },
];

const FLOWS: { title: string; tone: string; steps: string[] }[] = [
  {
    title: 'Donation / invoice payment',
    tone: 'text-amber-700',
    steps: [
      'Browser POSTs /api/donations/intent (or /pay/[id]) → creates donation + payment rows, returns a Razorpay order (or renders UPI QR / PhonePe checkout).',
      'Supporter pays in the hosted checkout or their UPI app.',
      '/api/donations/verify checks the signature, marks captured, sets dues/invoice paid, enqueues a receipt job.',
      'Webhooks /api/webhooks/razorpay + /phonepe (HMAC-verified) back up the client flow.',
      'Automation engine renders the 80G-style PDF receipt and emails (Resend) + WhatsApps it to the donor.',
    ],
  },
  {
    title: 'Lions SSO login → member upsert',
    tone: 'text-blue-700',
    steps: [
      '/api/auth/oidc/login generates PKCE + state + nonce, redirects to the Lions IdP.',
      'Callback verifies state, exchanges code for tokens (PKCE), verifies the ID token via JWKS.',
      'userinfo → upsert oauth_accounts (by lions_member_id then email), promotes role claims onto members.',
      'createSession() sets a signed cookie; writeAudit("oauth.login"); redirect → /admin.',
    ],
  },
  {
    title: 'Sync engine (CSV · REST · webhook)',
    tone: 'text-blue-700',
    steps: [
      'Officer (RBAC sync.trigger) uploads CSV / triggers REST pull; or Lions POSTs a signed payload to /api/webhooks/lions.',
      'runSyncJob() opens a sync_logs row; the entity adapter validates each row with Zod.',
      'Valid rows upsert members / clubs / districts; failures captured; a cursor is persisted for REST.',
      'sync_logs finalised with counts; writeAudit(success | partial | failed). sync-worker cron drains the queue daily.',
    ],
  },
  {
    title: 'Automation, cron & notifications',
    tone: 'text-emerald-700',
    steps: [
      'Events (new member, captured donation, officer appointment, dues due) enqueue rows in automation_jobs.',
      'Vercel Cron hits /api/cron/automation (Bearer CRON_SECRET) on schedule; the engine claims and runs handlers.',
      'Handlers send email (Resend), WhatsApp (Twilio / Meta Cloud), SMS and Web Push; each writes a comms log.',
      'Report crons generate monthly / quarterly / half-yearly / yearly PDFs; action-item, donor-pack and sync-worker crons follow.',
    ],
  },
  {
    title: 'AI & OCR assist',
    tone: 'text-purple-700',
    steps: [
      'Activity narrative (EN+GU), AI greetings, creative copy and club insights call OpenAI via /api/ai/*.',
      'UPI payment proof and expense bills are OCR’d (/api/ai/ocr) to auto-fill amounts and reconcile.',
      'With no OpenAI key present, every feature falls back to deterministic hand-written templates.',
    ],
  },
];

const CRONS: [string, string, string][] = [
  ['Daily 03:00', '/api/cron/automation?schedule=1', 'Automation engine — reminders, receipts, notifications.'],
  ['Monthly 1st 04:00', '/api/cron/reports?type=monthly', 'Monthly activity & finance report PDF.'],
  ['Quarterly 1st 05:00', '/api/cron/reports?type=quarterly', 'Quarterly consolidated report.'],
  ['Half-yearly 1st 06:00', '/api/cron/reports?type=half_yearly', 'Half-yearly consolidated report.'],
  ['Yearly Jul 1 07:00', '/api/cron/reports?type=yearly', 'Annual report aligned to the Lions year.'],
  ['Daily 08:00', '/api/cron/action-items', 'Surfaces & reminds outstanding zone action items.'],
  ['Apr 1–7 09:00', '/api/cron/donor-pack', 'Builds annual donor appreciation packs.'],
  ['Daily 10:00', '/api/cron/sync-worker', 'Drains the sync queue against Lions REST.'],
];

const SECURITY = [
  'Row-Level Security on every table; the service-role key is server-only and never bundled to the browser.',
  'Secrets read through a Zod env schema; in-app secrets (OIDC, Lions API, OpenAI, VAPID, Cron) wrapped with AES-256-GCM at rest.',
  'OIDC code flow protected by state + PKCE + nonce; ID tokens verified against the provider JWKS.',
  'Razorpay & PhonePe webhooks HMAC-verified; Lions inbound webhook signed with a shared HMAC-SHA256 secret.',
  'Public POST endpoints rate-limited; append-only audit_logs capture every privileged action; RBAC denials recorded.',
  'Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) set in vercel.json.',
  'No scraping — all Lions data ingested via OIDC userinfo, official REST APIs, or human-uploaded CSV/Excel.',
];

export default async function WorkflowPage() {
  await Promise.all([
    loadOidcSettings(true), loadLionsApiSettings(true), loadCronSecret(true),
    loadVapidConfig(true), loadOpenAiConfig(true),
  ]);
  const registry = getIntegrationRegistry();
  const summary = summarizeIntegrations();
  const pct = summary.total ? Math.round((summary.configured / summary.total) * 100) : 0;

  const grouped = new Map<IntegrationCategory, IntegrationDescriptor[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const r of registry) grouped.get(r.category)?.push(r);

  // clusters for the architecture diagram
  const clusters: { cat: IntegrationCategory; names: string[] }[] = CATEGORY_ORDER
    .filter((c) => c !== 'database')
    .map((cat) => ({ cat, names: (grouped.get(cat) ?? []).map((i) => i.name) }));

  return (
    <div className="space-y-8">
      {/* ---- header ---- */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <WorkflowIcon className="text-cyan-500" /> System Workflow
          </h1>
          <p className="text-gray-600 max-w-3xl">
            The whole platform on one page — the <strong>Website</strong>, the <strong>Admin / CRM</strong>,
            and the <strong>Mobile App</strong>, with every integration and configuration wired and linked
            together. The same map is exported as a printable PDF blueprint.
          </p>
        </div>
        <a
          href={PDF_HREF}
          download
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 text-white text-sm font-semibold hover:bg-navy-900 shadow flex-shrink-0"
        >
          <Download size={16} /> Download PDF blueprint
        </a>
      </div>

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="User surfaces" value="3" color="#0B1F4D" />
        <KpiTile label="Integrations" value={String(summary.total)} color="#0891b2" />
        <KpiTile label="Live now" value={`${summary.configured}`} color="#16A34A" />
        <KpiTile label="Wired health" value={`${pct}%`} color={pct >= 80 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626'} />
      </div>

      {/* ---- architecture diagram ---- */}
      <section className="bg-white border rounded-xl p-5 md:p-7">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
          Architecture — wired overview
        </h2>

        {/* surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SURFACES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.name} className={`rounded-lg border-t-4 ${s.accent} bg-slate-50 border border-gray-200 p-4 shadow-sm`}>
                <div className="flex items-center gap-2 font-bold text-navy-800">
                  <Icon size={16} /> {s.name}
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
                  {s.items.map((it) => <li key={it}>· {it}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        <Arrows count={3} />

        {/* API layer */}
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-center">
          <span className="font-bold text-navy-800 text-sm">Next.js 16 App Router</span>
          <span className="text-gray-600 text-sm"> — API routes · middleware · RBAC guards · Zod validation · rate-limit</span>
        </div>

        <Arrows count={1} />

        {/* Supabase core */}
        <div className="rounded-lg bg-cyan-50 border border-cyan-200 px-4 py-3 text-center">
          <div className="font-bold text-cyan-800 text-sm flex items-center justify-center gap-2">
            <Database size={15} /> Supabase Core — Postgres (RLS) · Auth · Storage · 55 migrations
          </div>
          <div className="text-[11px] text-gray-600 mt-1">
            members · clubs · districts · zones · officers · dues · donations · payments · invoices · activities ·
            events · beneficiaries · reports · audit_logs · sync_logs · automation_jobs
          </div>
        </div>

        <Arrows count={1} dashed />

        {/* integration clusters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {clusters.map(({ cat, names }) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <div key={cat} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <span className="text-xs font-bold text-navy-800 flex items-center gap-1">
                    <Icon size={12} /> {meta.label}
                  </span>
                </div>
                <ul className="space-y-0.5 text-[11px] text-gray-600">
                  {names.map((n) => <li key={n}>· {n}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong className="text-amber-800">How to read this:</strong> solid arrows = synchronous request path
          (browser → API → database); dashed arrow = the database / automation layer reaching out to external
          providers (webhooks, cron jobs, AI). Every integration degrades gracefully — the feature it powers simply hides.
        </p>
      </section>

      {/* ---- integration registry ---- */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Plug size={14} /> Integrations & configuration ({summary.configured}/{summary.total} live)
        </h2>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (!items.length) return null;
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.chip}`}><Icon size={14} /></span>
                <h3 className="text-sm font-semibold text-gray-700">{meta.label}</h3>
                <span className="text-xs text-gray-400">
                  {items.filter((i) => i.configured).length}/{items.length} live
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {items.map((i) => <IntegrationRow key={i.key} item={i} />)}
              </div>
            </div>
          );
        })}
      </section>

      {/* ---- data flows ---- */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Key data flows</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FLOWS.map((f) => (
            <Card key={f.title}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-base ${f.tone}`}>{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {f.steps.map((s, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-800 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- cron schedule ---- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Clock size={14} /> Automation schedule (Vercel Cron)
        </h2>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-2">Schedule</th>
                <th className="text-left font-semibold px-4 py-2">Endpoint</th>
                <th className="text-left font-semibold px-4 py-2 hidden md:table-cell">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CRONS.map(([s, e, p]) => (
                <tr key={e} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-slate-700 whitespace-nowrap">{s}</td>
                  <td className="px-4 py-2"><code className="text-xs text-gray-800">{e}</code></td>
                  <td className="px-4 py-2 text-gray-600 hidden md:table-cell">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- security ---- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={14} /> Security & compliance posture
        </h2>
        <div className="bg-white border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {SECURITY.map((s) => (
            <div key={s} className="flex gap-2 text-sm text-gray-700">
              <CheckCircle2 size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-navy-800 text-white px-5 py-4">
        <div>
          <div className="font-bold flex items-center gap-2"><Download size={16} /> One-file blueprint</div>
          <div className="text-sm text-gray-300">
            Everything above, print-ready. Live integration health lives at{' '}
            <Link href="/admin/integrations" className="underline text-amber-300">/admin/integrations</Link>.
          </div>
        </div>
        <a href={PDF_HREF} download className="px-4 py-2 rounded-lg bg-amber-400 text-navy-900 text-sm font-semibold hover:bg-amber-300 flex-shrink-0">
          Download PDF
        </a>
      </div>
    </div>
  );
}

function Arrows({ count, dashed }: { count: number; dashed?: boolean }) {
  return (
    <div className="flex justify-center gap-24 my-3 text-gray-300">
      {Array.from({ length: count }).map((_, i) => (
        <ArrowDown key={i} size={18} className={dashed ? 'opacity-50' : ''} />
      ))}
    </div>
  );
}

function IntegrationRow({ item }: { item: IntegrationDescriptor }) {
  return (
    <div className={`rounded-lg border p-3 ${item.configured ? 'bg-white' : 'bg-gray-50 border-dashed'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-navy-800 text-sm flex items-center gap-1.5">
          {item.configured
            ? <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
            : <XCircle size={14} className="text-gray-400 flex-shrink-0" />}
          {item.name}
        </div>
        {item.adminHref && (
          <Link href={item.adminHref} className="text-xs text-amber-600 hover:text-amber-800 flex-shrink-0">Open →</Link>
        )}
      </div>
      <p className="text-xs text-gray-600 mt-1">{item.description}</p>
      {item.envVars.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.envVars.map((e) => (
            <code
              key={e.name}
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                e.required ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
              title={e.hint}
            >
              {e.name}
            </code>
          ))}
        </div>
      )}
      {!item.configured && item.whenMissing && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
          <strong>If missing:</strong> {item.whenMissing}
        </p>
      )}
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="relative bg-white border rounded-lg p-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-bold text-navy-800">{value}</div>
    </div>
  );
}
