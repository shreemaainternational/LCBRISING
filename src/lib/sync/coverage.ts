/**
 * Compute per-entity sync coverage for /admin/sync. Reads the
 * sync_ledger forward index plus a fallback count from the source
 * table when the ledger is empty.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface EntityCoverage {
  entity: string;
  label: string;
  icon: string;
  total: number;
  synced: number;
  errored: number;
  pending: number;
  lastSyncedAt: string | null;
  pct: number;
}

const ENTITIES: { key: string; label: string; icon: string; sourceTable: string; deletedColumn?: string }[] = [
  { key: 'clubs',      label: 'Clubs',      icon: '🦁', sourceTable: 'clubs',      deletedColumn: 'deleted_at' },
  { key: 'members',    label: 'Members',    icon: '👥', sourceTable: 'members',    deletedColumn: 'deleted_at' },
  { key: 'officers',   label: 'Officers',   icon: '⭐', sourceTable: 'club_officers' },
  { key: 'activities', label: 'Activities', icon: '🎯', sourceTable: 'activities' },
  { key: 'dues',       label: 'Dues',       icon: '💳', sourceTable: 'dues_invoices' },
  { key: 'awards',     label: 'Awards',     icon: '🏆', sourceTable: 'awards' },
];

async function countTable(table: string, deletedColumn?: string): Promise<number> {
  const db = createAdminClient();
  try {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (deletedColumn) q = q.is(deletedColumn, null);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getEntityCoverage(): Promise<EntityCoverage[]> {
  const db = createAdminClient();
  const out: EntityCoverage[] = [];

  for (const e of ENTITIES) {
    const [total, ledger] = await Promise.all([
      countTable(e.sourceTable, e.deletedColumn),
      db.from('sync_ledger')
        .select('last_status, last_synced_at')
        .eq('entity', e.key)
        .order('last_synced_at', { ascending: false, nullsFirst: false }),
    ]);

    const rows = (ledger.data ?? []) as { last_status: string; last_synced_at: string | null }[];
    const synced = rows.filter((r) => r.last_status === 'synced').length;
    const errored = rows.filter((r) => r.last_status === 'error').length;
    const lastSyncedAt = rows.find((r) => r.last_synced_at)?.last_synced_at ?? null;
    const pending = Math.max(0, total - synced - errored);
    const pct = total > 0 ? Math.round((synced / total) * 100) : 0;

    out.push({ entity: e.key, label: e.label, icon: e.icon, total, synced, errored, pending, lastSyncedAt, pct });
  }
  return out;
}

export interface QueueSnapshot {
  pending: number;
  processing: number;
  failed: number;
  dead: number;
  done24h: number;
  nextReady: string | null;
}

export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [pending, processing, failed, dead, done24h, next] = await Promise.all([
    db.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    db.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    db.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'dead'),
    db.from('sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'done').gte('finished_at', since),
    db.from('sync_queue').select('next_retry_at').eq('status', 'pending').order('next_retry_at', { ascending: true }).limit(1).maybeSingle(),
  ]);
  return {
    pending: pending.count ?? 0,
    processing: processing.count ?? 0,
    failed: failed.count ?? 0,
    dead: dead.count ?? 0,
    done24h: done24h.count ?? 0,
    nextReady: (next.data as { next_retry_at?: string } | null)?.next_retry_at ?? null,
  };
}
