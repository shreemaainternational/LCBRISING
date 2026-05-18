import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { isOidcConfigured } from '@/lib/oidc';
import { isLionsApiConfigured, getLionsApiConfig } from '@/lib/oidc/lions';
import {
  ArrowLeft, Globe, CheckCircle2, XCircle, Webhook, RefreshCw, Database,
  Users, Building2, Map, ShieldCheck, AlertTriangle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type WebhookRow = {
  id: string;
  event_id: string;
  event_type: string;
  status: 'pending' | 'processed' | 'failed' | 'skipped';
  received_at: string;
  processed_at: string | null;
  error: string | null;
};

type SyncLogRow = {
  id: string;
  entity: string;
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed';
  finished_at: string | null;
  records_inserted: number | null;
  records_updated: number | null;
  records_failed: number | null;
  error_message: string | null;
};

const WEBHOOK_VARIANT: Record<WebhookRow['status'], 'success' | 'warning' | 'danger' | 'outline'> = {
  processed: 'success',
  pending: 'warning',
  failed: 'danger',
  skipped: 'outline',
};

const LOG_VARIANT: Record<SyncLogRow['status'], 'success' | 'warning' | 'danger' | 'secondary' | 'outline'> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
  running: 'secondary',
  queued: 'outline',
};

export default async function LionsHubPage() {
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true)]);
  const oidcOn = isOidcConfigured();
  const restOn = isLionsApiConfigured();
  const restCfg = restOn ? getLionsApiConfig() : null;

  const db = createAdminClient();

  const since24h = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    webhooksRes,
    webhookCountsRes,
    queueCountsRes,
    logsRes,
    membersSyncedRes,
    membersTotalRes,
    clubsSyncedRes,
    clubsTotalRes,
    districtsTotalRes,
  ] = await Promise.all([
    db
      .from('lions_webhook_events')
      .select('id, event_id, event_type, status, received_at, processed_at, error')
      .order('received_at', { ascending: false })
      .limit(15),
    db
      .from('lions_webhook_events')
      .select('status', { count: 'exact', head: false })
      .gte('received_at', since24h),
    db
      .from('sync_queue')
      .select('status, source')
      .eq('source', 'lions_rest'),
    db
      .from('sync_logs')
      .select('id, entity, status, finished_at, records_inserted, records_updated, records_failed, error_message')
      .eq('source', 'lions_rest')
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('members').select('id', { count: 'exact', head: true }).not('lions_member_id', 'is', null),
    db.from('members').select('id', { count: 'exact', head: true }),
    db.from('clubs').select('id', { count: 'exact', head: true }).not('source_id', 'is', null),
    db.from('clubs').select('id', { count: 'exact', head: true }),
    db.from('districts').select('id', { count: 'exact', head: true }),
  ]);

  const webhooks = (webhooksRes.data ?? []) as WebhookRow[];
  const logs = (logsRes.data ?? []) as SyncLogRow[];

  const webhookStats = { processed: 0, pending: 0, failed: 0, skipped: 0 };
  for (const row of (webhookCountsRes.data ?? []) as { status: WebhookRow['status'] }[]) {
    webhookStats[row.status] = (webhookStats[row.status] ?? 0) + 1;
  }

  const queueStats = { pending: 0, processing: 0, failed: 0, dead: 0, done: 0 };
  for (const row of (queueCountsRes.data ?? []) as { status: string }[]) {
    const k = row.status as keyof typeof queueStats;
    if (k in queueStats) queueStats[k] += 1;
  }

  const membersSynced = membersSyncedRes.count ?? 0;
  const membersTotal = membersTotalRes.count ?? 0;
  const clubsSynced = clubsSyncedRes.count ?? 0;
  const clubsTotal = clubsTotalRes.count ?? 0;
  const districtsTotal = districtsTotalRes.count ?? 0;
  const memberPct = membersTotal ? Math.round((membersSynced / membersTotal) * 100) : 0;
  const clubPct = clubsTotal ? Math.round((clubsSynced / clubsTotal) * 100) : 0;

  const channelsLive = (oidcOn ? 1 : 0) + (restOn ? 1 : 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Globe className="text-blue-500" /> Lions International CRM Hub
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Single pane for the Lions identity, REST sync adapter, inbound webhook
            stream, queue health, and how much of the CRM is actually backed by
            Lions-sourced records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/integrations/oidc"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800"
          >
            <ShieldCheck size={14} /> Configure auth + REST
          </Link>
          <Link
            href="/admin/sync/lions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Run sync
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ChannelTile
          icon={<ShieldCheck size={16} />}
          label="OIDC SSO"
          on={oidcOn}
          subtitle={oidcOn ? 'PKCE + JWKS verified' : 'Not configured'}
        />
        <ChannelTile
          icon={<Database size={16} />}
          label="REST adapter"
          on={restOn}
          subtitle={restCfg?.baseUrl ?? 'Dry-run mode'}
        />
        <ChannelTile
          icon={<Webhook size={16} />}
          label="Inbound webhook"
          on={webhookStats.processed + webhookStats.pending + webhookStats.skipped > 0 || webhookStats.failed > 0}
          subtitle={
            webhookStats.processed + webhookStats.pending + webhookStats.failed + webhookStats.skipped > 0
              ? `${webhookStats.processed + webhookStats.pending + webhookStats.failed + webhookStats.skipped} events / 24h`
              : 'No traffic in 24h'
          }
        />
        <ChannelTile
          icon={<RefreshCw size={16} />}
          label="Channels live"
          on={channelsLive > 0}
          subtitle={`${channelsLive} of 2 transports`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoverageCard
          icon={<Users size={16} className="text-blue-600" />}
          label="Members"
          synced={membersSynced}
          total={membersTotal}
          pct={memberPct}
          hint="Members carrying a lions_member_id from the upstream registry."
        />
        <CoverageCard
          icon={<Building2 size={16} className="text-emerald-600" />}
          label="Clubs"
          synced={clubsSynced}
          total={clubsTotal}
          pct={clubPct}
          hint="Clubs linked back to an upstream source_id (MyLCI club number)."
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Map size={16} className="text-amber-600" /> Districts on file
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-navy-900">{districtsTotal}</div>
            <p className="text-xs text-gray-500 mt-1">
              Federation rows (multi-district → district). Sync via{' '}
              <code>/api/sync/lions</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={16} /> Lions sync queue
            </span>
            <Link href="/admin/sync" className="text-xs text-amber-600 hover:text-amber-800">
              Full queue →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <QTile label="Pending" value={queueStats.pending} tone={queueStats.pending ? 'amber' : 'gray'} />
            <QTile label="Processing" value={queueStats.processing} tone="blue" />
            <QTile label="Failed" value={queueStats.failed} tone={queueStats.failed ? 'amber' : 'gray'} />
            <QTile label="Dead" value={queueStats.dead} tone={queueStats.dead ? 'rose' : 'gray'} />
            <QTile label="Done" value={queueStats.done} tone="green" />
          </div>
          {(queueStats.failed > 0 || queueStats.dead > 0) && (
            <p className="text-xs text-amber-700 mt-3 inline-flex items-center gap-1">
              <AlertTriangle size={12} /> {queueStats.failed + queueStats.dead} job(s) need attention. Open the queue to retry or inspect errors.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Webhook size={16} /> Inbound webhook events
            </span>
            <span className="text-xs text-gray-500">
              24h: {webhookStats.processed} ok · {webhookStats.pending} pending · {webhookStats.failed} failed · {webhookStats.skipped} skipped
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {webhooks.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No inbound webhook events yet. Point the Lions provider at{' '}
              <code className="bg-gray-100 px-1 rounded">POST /api/webhooks/lions</code> with an{' '}
              <code className="bg-gray-100 px-1 rounded">X-Lions-Signature</code> HMAC header. The
              shared secret lives on <Link href="/admin/integrations/oidc" className="text-amber-700 hover:underline">the REST setup form</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Event</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Received</th>
                    <th className="text-left p-3">Processed</th>
                    <th className="text-left p-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((w) => (
                    <tr key={w.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium">{w.event_type}</div>
                        <div className="text-xs text-gray-500 font-mono truncate max-w-[14rem]" title={w.event_id}>
                          {w.event_id}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={WEBHOOK_VARIANT[w.status]}>{w.status}</Badge>
                      </td>
                      <td className="p-3 text-gray-600">{new Date(w.received_at).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-gray-500">
                        {w.processed_at ? new Date(w.processed_at).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-red-700 text-xs max-w-xs truncate">{w.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Lions sync runs</span>
            <Link href="/admin/sync" className="text-xs text-amber-600 hover:text-amber-800">
              All runs →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No <code>lions_rest</code> runs recorded yet. Trigger one from{' '}
              <Link href="/admin/sync/lions" className="text-amber-700 hover:underline">Run sync</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Entity</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">In / Up / Fail</th>
                    <th className="text-left p-3">Finished</th>
                    <th className="text-left p-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="p-3 font-medium">{l.entity}</td>
                      <td className="p-3"><Badge variant={LOG_VARIANT[l.status]}>{l.status}</Badge></td>
                      <td className="p-3 text-right tabular-nums">
                        <span className="text-green-700">{l.records_inserted ?? 0}</span>
                        {' / '}
                        <span className="text-blue-700">{l.records_updated ?? 0}</span>
                        {' / '}
                        <span className="text-red-700">{l.records_failed ?? 0}</span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {l.finished_at ? new Date(l.finished_at).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-red-700 text-xs max-w-xs truncate">{l.error_message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelTile({
  icon, label, on, subtitle,
}: { icon: React.ReactNode; label: string; on: boolean; subtitle: string }) {
  return (
    <div className="relative bg-white border rounded-lg p-4 overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: on ? '#16A34A' : '#94A3B8' }}
      />
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {icon} {label}
        {on
          ? <CheckCircle2 size={12} className="text-green-600" />
          : <XCircle size={12} className="text-gray-400" />}
      </div>
      <div className="text-sm text-gray-800 font-medium truncate" title={subtitle}>{subtitle}</div>
    </div>
  );
}

function CoverageCard({
  icon, label, synced, total, pct, hint,
}: { icon: React.ReactNode; label: string; synced: number; total: number; pct: number; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">{icon} {label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-extrabold text-navy-900">{synced}<span className="text-base text-gray-400">/{total}</span></div>
          <div className="text-sm text-gray-600 tabular-nums">{pct}%</div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QTile({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'blue' | 'green' | 'rose' | 'gray' }) {
  const color =
    tone === 'amber' ? 'text-amber-700' :
    tone === 'blue'  ? 'text-blue-700'  :
    tone === 'green' ? 'text-emerald-700' :
    tone === 'rose'  ? 'text-rose-700'  : 'text-gray-500';
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
    </div>
  );
}
