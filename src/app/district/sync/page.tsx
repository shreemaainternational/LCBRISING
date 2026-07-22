import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { isLionsApiConfigured, isLionsApiSandboxActive } from '@/lib/oidc/lions';
import { CheckCircle2, AlertTriangle, RefreshCw, Globe2, MapPin } from 'lucide-react';
import { MasterSyncPanel } from './MasterSyncPanel';
import { DistrictPortalUpload } from '@/components/admin/DistrictPortalUpload';
import type { LionsSyncReport } from '@/lib/oidc/lions';

export const dynamic = 'force-dynamic';

interface RunRow {
  id: string;
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed';
  trigger: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  totals: { fetched?: number; inserted?: number; updated?: number; skipped?: number; errors?: number };
  reports: LionsSyncReport[];
  error_message: string | null;
}

export default async function DistrictSyncPage() {
  const ctx = await requireDistrictGovernor();
  const apiConfigured = isLionsApiConfigured();
  const sandbox = isLionsApiSandboxActive();
  const { data: runs } = await createAdminClient()
    .from('district_sync_runs')
    .select('id, status, trigger, started_at, finished_at, duration_ms, totals, reports, error_message')
    .eq('district_id', ctx.district.id)
    .order('started_at', { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
            <Globe2 className="text-amber-500" size={28} />
            Master Sync Console
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-3xl">
            One-click full-tree synchronisation with Lions International.
            Pulls districts → clubs → members in sequence, writes an audit row
            per run, and surfaces per-entity counts so the District Secretary
            can verify the MyLCI handoff every quarter.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          sandbox ? 'bg-purple-100 text-purple-700' :
          apiConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {sandbox ? 'Sandbox' : apiConfigured ? 'Live LCI API' : 'Not configured'}
        </span>
      </div>

      <DistrictTabs />

      <MasterSyncPanel sandbox={sandbox} apiConfigured={apiConfigured} />

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2 mb-1">
          <MapPin size={15} className="text-amber-500" /> Upload district data (portal export)
        </h3>
        <p className="text-sm text-gray-600 mb-3 max-w-3xl">
          No live API? Download your district report from the{' '}
          <a href="https://lionsinternational.my.site.com/s/" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">Lions Member Portal</a>{' '}
          as Excel / CSV and upload it here to sync your district&apos;s data.
        </p>
        <DistrictPortalUpload districtId={ctx.district.id} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2">
            <RefreshCw size={14} className="text-blue-500" /> Sync run history
          </h3>
          <span className="text-xs text-gray-500">last 25 runs</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Started</th>
              <th className="text-left p-3">Trigger</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Fetched</th>
              <th className="text-right p-3">Inserted</th>
              <th className="text-right p-3">Updated</th>
              <th className="text-right p-3">Errors</th>
              <th className="text-right p-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {!runs?.length ? (
              <tr><td colSpan={8} className="p-6 text-center text-sm text-gray-500">
                No syncs yet — click <strong>Run Master Sync</strong> above.
              </td></tr>
            ) : (runs as RunRow[]).map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50 align-top">
                <td className="p-3 text-xs text-gray-600">
                  {new Date(r.started_at).toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-xs text-gray-600 capitalize">{r.trigger}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'failed'  ? 'bg-rose-100 text-rose-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {r.status === 'success' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                    {r.status}
                  </span>
                  {r.error_message && (
                    <div className="text-[11px] text-rose-700 mt-1 font-mono">{r.error_message}</div>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">{r.totals?.fetched ?? 0}</td>
                <td className="p-3 text-right tabular-nums text-emerald-700">{r.totals?.inserted ?? 0}</td>
                <td className="p-3 text-right tabular-nums text-blue-700">{r.totals?.updated ?? 0}</td>
                <td className={`p-3 text-right tabular-nums ${r.totals?.errors ? 'text-rose-700' : 'text-gray-500'}`}>
                  {r.totals?.errors ?? 0}
                </td>
                <td className="p-3 text-right text-xs text-gray-600">
                  {r.duration_ms ? `${Math.round(r.duration_ms / 100) / 10}s` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
