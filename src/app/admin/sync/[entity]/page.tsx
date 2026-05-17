import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { RetryJobButton } from './RetryJobButton';

export const dynamic = 'force-dynamic';

const VALID = new Set(['clubs', 'members', 'officers', 'activities', 'dues', 'awards']);

interface QueueRow {
  id: string;
  status: string;
  operation: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  created_at: string;
  entity_id: string | null;
  external_id: string | null;
  finished_at: string | null;
}

interface LedgerRow {
  entity_id: string;
  external_id: string | null;
  last_status: string;
  last_synced_at: string | null;
  last_error: string | null;
  attempts: number;
}

export default async function EntitySyncPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!VALID.has(entity)) notFound();

  const db = createAdminClient();
  const [queue, ledger] = await Promise.all([
    db.from('sync_queue')
      .select('id, status, operation, attempts, max_attempts, next_retry_at, last_error, created_at, entity_id, external_id, finished_at')
      .eq('entity', entity)
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('sync_ledger')
      .select('entity_id, external_id, last_status, last_synced_at, last_error, attempts')
      .eq('entity', entity)
      .order('last_synced_at', { ascending: false, nullsFirst: false })
      .limit(50),
  ]);

  const qrows = (queue.data ?? []) as QueueRow[];
  const lrows = (ledger.data ?? []) as LedgerRow[];

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/sync" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Sync
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 capitalize">{entity}</h1>
          <p className="text-gray-600 text-sm">
            Sync detail for {entity}. Queue items show retries in flight; the ledger
            shows confirmed Lions Intl external IDs.
          </p>
        </div>
        <a href={`/api/sync/${entity}/export`} download
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
          <Download size={14} /> Export CSV
        </a>
      </div>

      <Card>
        <CardHeader><CardTitle>Queue ({qrows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {qrows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No queue rows for {entity}. Trigger a sync from <code>/admin/sync</code> or
              POST to <code>/api/sync/run</code>.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Op</th>
                  <th className="text-right p-3">Attempts</th>
                  <th className="text-left p-3">Next try</th>
                  <th className="text-left p-3">Last error</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {qrows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3"><StatusPill s={r.status} /></td>
                    <td className="p-3 text-xs text-gray-600">{r.operation}</td>
                    <td className="p-3 text-xs text-right tabular-nums">{r.attempts}/{r.max_attempts}</td>
                    <td className="p-3 text-xs text-gray-600">{new Date(r.next_retry_at).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-xs text-rose-700 max-w-xs truncate">{r.last_error ?? '—'}</td>
                    <td className="p-3 text-right">
                      {(r.status === 'dead' || r.status === 'failed') && <RetryJobButton id={r.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ledger ({lrows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {lrows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No ledger entries yet. They appear after the queue worker confirms a push.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs">
                <tr>
                  <th className="text-left p-3">Internal ID</th>
                  <th className="text-left p-3">External ID</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Attempts</th>
                  <th className="text-left p-3">Last synced</th>
                </tr>
              </thead>
              <tbody>
                {lrows.map((r) => (
                  <tr key={r.entity_id} className="border-t">
                    <td className="p-3 font-mono text-xs text-gray-700">{r.entity_id.slice(0, 8)}…</td>
                    <td className="p-3 font-mono text-xs text-gray-700">{r.external_id ?? '—'}</td>
                    <td className="p-3"><StatusPill s={r.last_status} /></td>
                    <td className="p-3 text-xs text-right tabular-nums">{r.attempts}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {r.last_synced_at ? new Date(r.last_synced_at).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const isOk = s === 'done' || s === 'synced' || s === 'success';
  const isBad = s === 'dead' || s === 'failed' || s === 'error';
  const Icon = isOk ? CheckCircle2 : isBad ? AlertCircle : Clock;
  const variant: 'success' | 'danger' | 'warning' | 'secondary' =
    isOk ? 'success' : isBad ? 'danger' : 'warning';
  return (
    <Badge variant={variant} className="inline-flex items-center gap-1">
      <Icon size={10} /> {s}
    </Badge>
  );
}
