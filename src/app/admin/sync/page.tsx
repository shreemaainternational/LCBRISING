import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import SyncUploader from './SyncUploader';

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

export default async function SyncPage() {
  const supa = await createClient();
  const { data: logs } = await supa
    .from('sync_logs')
    .select('id, source, entity, status, started_at, finished_at, records_total, records_inserted, records_updated, records_failed, error_message')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (logs ?? []) as SyncLogRow[];

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Sync</h1>
      <p className="text-gray-600 mb-8">
        Import member/club/officer/attendance data from CSV exports, and audit every sync run.
      </p>

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
