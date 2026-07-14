import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getIntegrationRegistry, summarizeIntegrations, type IntegrationCategory, type IntegrationDescriptor } from '@/lib/integrations-registry';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadCronSecret } from '@/lib/cron-auth';
import { loadVapidConfig } from '@/lib/push-config';
import { loadOpenAiConfig } from '@/lib/ai/openai-config';
import { loadCanvaRuntime } from '@/lib/canva/config';
import { QuickEnableSandbox } from './QuickEnableSandbox';
import {
  Plug, CheckCircle2, XCircle, AlertTriangle, Lock, Database, CreditCard, MessageSquare,
  Brain, Share2, Image as ImageIcon, Server, ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORY_META: Record<IntegrationCategory, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  identity:  { label: 'Identity & Access',     icon: Lock,          color: 'bg-blue-100 text-blue-700' },
  database:  { label: 'Database',              icon: Database,      color: 'bg-cyan-100 text-cyan-700' },
  payments:  { label: 'Payments',              icon: CreditCard,    color: 'bg-amber-100 text-amber-700' },
  messaging: { label: 'Messaging',             icon: MessageSquare, color: 'bg-emerald-100 text-emerald-700' },
  ai:        { label: 'AI',                    icon: Brain,         color: 'bg-purple-100 text-purple-700' },
  social:    { label: 'Social',                icon: Share2,        color: 'bg-pink-100 text-pink-700' },
  media:     { label: 'Media',                 icon: ImageIcon,     color: 'bg-rose-100 text-rose-700' },
  platform:  { label: 'Platform',              icon: Server,        color: 'bg-slate-100 text-slate-700' },
};

const CATEGORY_ORDER: IntegrationCategory[] = [
  'identity', 'database', 'payments', 'messaging', 'ai', 'social', 'media', 'platform',
];

export default async function IntegrationsPage() {
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true), loadCronSecret(true), loadVapidConfig(true), loadOpenAiConfig(true), loadCanvaRuntime(true)]);
  const registry = getIntegrationRegistry();
  const summary = summarizeIntegrations();
  const pct = summary.total ? Math.round((summary.live / summary.total) * 100) : 0;
  const livePct = summary.total ? (summary.live / summary.total) * 100 : 0;
  const degradedPct = summary.total ? (summary.degraded / summary.total) * 100 : 0;

  // "Pending" = anything not fully live: degraded (sandbox/auto) first, then
  // off. Within each, required-dependency services bubble up.
  const pending = registry
    .filter((r) => r.status !== 'live')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'degraded' ? -1 : 1;
      const aReq = a.envVars.some((e) => e.required) ? 0 : 1;
      const bReq = b.envVars.some((e) => e.required) ? 0 : 1;
      return aReq - bReq;
    });

  const lionsOidc = registry.find((r) => r.key === 'lions_oidc');
  const lionsRest = registry.find((r) => r.key === 'lions_rest');
  const lionsAllOff = !lionsOidc?.configured && !lionsRest?.configured;

  const grouped = new Map<IntegrationCategory, IntegrationDescriptor[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const r of registry) grouped.get(r.category)?.push(r);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Plug className="text-cyan-500" /> Integrations Health
          </h1>
          <p className="text-gray-600">
            Every external service this platform talks to.
            <span className="font-semibold text-green-700"> Green = live</span> on real credentials,
            <span className="font-semibold text-amber-700"> amber = on but in sandbox / auto mode</span> (still pending real activation),
            <span className="font-semibold text-gray-500"> grey = off</span> (the platform degrades gracefully).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Live" value={String(summary.live)} color="#16A34A" />
        <KpiTile label="Sandbox / Auto" value={String(summary.degraded)} color="#F59E0B" />
        <KpiTile label="Off" value={String(summary.off)} color="#94A3B8" />
        <KpiTile label="Live health" value={`${pct}%`} color={pct >= 80 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626'} />
      </div>

      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall</span>
          <span className="text-xs text-gray-600">
            {summary.live} live · {summary.degraded} sandbox/auto · {summary.off} off
          </span>
        </div>
        <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-600 transition-all" style={{ width: `${livePct}%` }} />
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${degradedPct}%` }} />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h2 className="text-sm font-bold text-amber-900 mb-3 inline-flex items-center gap-2">
            <AlertTriangle size={15} /> Pending activation ({pending.length})
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pending.map((r) => (
              <li key={r.key} className="flex items-start gap-2 text-sm bg-white rounded-lg border px-3 py-2">
                {r.status === 'degraded'
                  ? <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  : <XCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <div className="font-semibold text-navy-800 flex items-center gap-2 flex-wrap">
                    {r.adminHref ? <Link href={r.adminHref} className="hover:underline">{r.name}</Link> : r.name}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      r.status === 'degraded' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'degraded' ? 'sandbox/auto' : 'off'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {r.status === 'degraded' && r.modeLabel ? r.modeLabel : r.whenMissing}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lionsAllOff ? (
        <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-amber-50 p-5">
          <h3 className="font-bold text-navy-800 mb-1 inline-flex items-center gap-2">
            <Plug className="text-purple-600" size={16} />
            Lions International integrations are not configured
          </h3>
          <p className="text-sm text-gray-700">
            You can either enter your real Lions Developer credentials, or flip on
            <strong> Sandbox mode</strong> right now to make the &ldquo;Sign in with Lions&rdquo; button and
            MyLCI sync work end-to-end with synthetic data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickEnableSandbox />
            <a href="/admin/integrations/oidc"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border text-xs font-semibold text-gray-800 hover:bg-gray-50">
              Open setup wizard →
            </a>
          </div>
        </div>
      ) : (
        <Link
          href="/admin/integrations/lions"
          className="block rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-amber-50 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Lions International</div>
              <div className="text-base font-bold text-navy-800">CRM Hub — auth, REST, webhooks, queue, coverage</div>
              <div className="text-xs text-gray-600 mt-0.5">One pane for the full integration: SSO + REST + inbound webhook stream + sync health.</div>
            </div>
            <span className="text-amber-700 font-semibold text-sm">Open →</span>
          </div>
        </Link>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat) ?? [];
        if (!items.length) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                <Icon size={16} />
              </div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {meta.label} <span className="text-gray-400">·</span>
                <span className="ml-1 text-gray-500 normal-case font-normal">
                  {items.filter((i) => i.configured).length}/{items.length} live
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((i) => <IntegrationCard key={i.key} item={i} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IntegrationCard({ item }: { item: IntegrationDescriptor }) {
  return (
    <Card className={item.status === 'off' ? 'opacity-90' : ''}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {item.status === 'live'
              ? <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
              : item.status === 'degraded'
                ? <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                : <XCircle size={16} className="text-gray-400 flex-shrink-0" />}
            <span className="truncate">{item.name}</span>
          </CardTitle>
        </div>
        {item.adminHref && (
          <Link href={item.adminHref}
            className="text-xs text-amber-600 hover:text-amber-800 inline-flex items-center gap-1 flex-shrink-0">
            Open <ExternalLink size={11} />
          </Link>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-gray-600">{item.description}</p>

        {item.status === 'degraded' && item.modeLabel && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 inline-flex items-start gap-1.5">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
            <span><strong>Sandbox / auto mode:</strong> {item.modeLabel}</span>
          </p>
        )}

        {!item.configured && item.whenMissing && (
          <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            <strong className="text-amber-800">Impact:</strong> {item.whenMissing}
          </p>
        )}

        {!item.configured && (item.key === 'lions_oidc' || item.key === 'lions_rest') && <QuickEnableSandbox />}

        {item.envVars.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-gray-600">
              {item.envVars.length} environment variable{item.envVars.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-2 space-y-1.5">
              {item.envVars.map((e) => (
                <li key={e.name} className="flex items-start gap-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                    e.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {e.required ? 'req' : 'opt'}
                  </span>
                  <code className={`font-mono ${e.public ? 'text-blue-700' : 'text-gray-800'}`}>
                    {e.name}
                  </code>
                  {e.hint && <span className="text-gray-500">— {e.hint}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
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
