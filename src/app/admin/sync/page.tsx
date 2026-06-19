import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import SyncUploader from './SyncUploader';
import { getEntityCoverage, getQueueSnapshot } from '@/lib/sync/coverage';
import { QueueActions } from './QueueActions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type SyncLogRow = {
  id: string;
  source: string;
  entity: string;
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed';
  started_at: string | null;
  finished_at: string | null;
  records_total: number | null;
  records_inserted: number | null;
  records_updated: number | null;
  records_failed: number | null;
  error_message: string | null;
};

const STATUS_VARIANT: Record<SyncLogRow['status'], 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'> = {
  queued: 'outline',
  running: 'secondary',
  success: 'success',
  partial: 'warning',
  failed: 'danger',
};

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
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

export default async function SyncPage() {
  const supa = await createClient();
  const [logsRes, coverage, queue] = await Promise.all([
    supa.from('sync_logs')
      .select('id, source, entity, status, started_at, finished_at, records_total, records_inserted, records_updated, records_failed, error_message')
      .order('created_at', { ascending: false }).limit(50),
    getEntityCoverage(),
    getQueueSnapshot(),
  ]);
  const rows = (logsRes.data ?? []) as SyncLogRow[];

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Sync</h1>
      <p className="text-gray-600 mb-8">
        Import member/club/officer/attendance data from CSV exports, and audit every sync run.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {coverage.map((c) => (
          <a key={c.entity} href={`/admin/sync/${c.entity}`}
            className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl">{c.icon}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{c.label}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-navy-900">{c.synced}/{c.total}</div>
                <div className="text-[10px] text-gray-500">{c.pct}%</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${c.pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-gray-500">{c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleDateString('en-IN') : 'Never'}</span>
              {c.errored > 0 && <span className="text-rose-700 font-bold">{c.errored} err</span>}
            </div>
          </a>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Queue</span>
            <QueueActions />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <QTile label="Pending"    value={queue.pending}    tone="amber" />
            <QTile label="Processing" value={queue.processing} tone="blue" />
            <QTile label="Failed"     value={queue.failed}     tone={queue.failed ? 'amber' : 'gray'} />
            <QTile label="Dead"       value={queue.dead}       tone={queue.dead ? 'rose' : 'gray'} />
            <QTile label="Done · 24h" value={queue.done24h}    tone="green" />
          </div>
          {queue.nextReady && (
            <p className="text-xs text-gray-600 mt-3">
              Next ready job at <strong>{new Date(queue.nextReady).toLocaleString('en-IN')}</strong>.
              Worker fires every 5 minutes via <code>/api/cron/sync-worker</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <Link href="/admin/sync/lions"
          className="p-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-amber-50 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Lions International</div>
              <div className="text-lg font-bold text-navy-800 mt-1">Sign in with Lions · Sync via MyLCI REST</div>
              <div className="text-sm text-gray-600 mt-1">
                OIDC SSO and REST sync for districts, clubs, members and awards.
              </div>
            </div>
            <span className="text-amber-600 font-medium">Open →</span>
          </div>
        </Link>
        <Link href="/admin/sync/duplicates"
          className="p-4 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI duplicate detector</div>
              <div className="text-lg font-bold text-navy-800 mt-1">Find merged-member candidates</div>
              <div className="text-sm text-gray-600 mt-1">
                Shared emails, phones, name+club matches — with optional AI confirmation.
              </div>
            </div>
            <span className="text-purple-600 font-medium">Open →</span>
          </div>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncUploader />
          <details className="mt-6 text-xs text-gray-600">
            <summary className="cursor-pointer">Expected CSV columns</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <strong>members</strong>
                <code className="block mt-1 bg-gray-50 p-2 rounded">email,name,phone,whatsapp,lions_member_id,club_id,district_id,lions_role,birthday</code>
              </div>
              <div>
                <strong>clubs</strong>
                <code className="block mt-1 bg-gray-50 p-2 rounded">name,club_number,district_id,zone_id,region_id,district,city,state,country,source_id</code>
              </div>
              <div>
                <strong>officers</strong>
                <code className="block mt-1 bg-gray-50 p-2 rounded">member_email|member_id,role,scope_kind,scope_id,term_start,term_end,status,source_id</code>
              </div>
              <div>
                <strong>attendance</strong>
                <code className="block mt-1 bg-gray-50 p-2 rounded">member_email|member_id,event_id,club_id,occurred_at,status,check_in_method,notes</code>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sync runs ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No sync runs yet. Use the importer above or hit{' '}
              <code className="bg-gray-100 px-1 rounded">POST /api/sync/run</code> from a script.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Source / Entity</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">In/Up/Fail</th>
                    <th className="text-right p-3">Duration</th>
                    <th className="text-left p-3">Finished</th>
                    <th className="text-left p-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium">{r.entity}</div>
                        <div className="text-xs text-gray-500">{r.source}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className="text-green-700">{r.records_inserted ?? 0}</span>
                        {' / '}
                        <span className="text-blue-700">{r.records_updated ?? 0}</span>
                        {' / '}
                        <span className="text-red-700">{r.records_failed ?? 0}</span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatDuration(r.started_at, r.finished_at)}</td>
                      <td className="p-3 text-gray-500">
                        {r.finished_at ? new Date(r.finished_at).toLocaleString() : '—'}
                      </td>
                      <td className="p-3 text-red-700 text-xs max-w-xs truncate">
                        {r.error_message ?? '—'}
                      </td>
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
