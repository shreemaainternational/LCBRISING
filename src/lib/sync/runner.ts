import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import type { SyncAdapter, SyncJobInput, SyncResult } from './types';

const ADAPTERS = new Map<string, SyncAdapter>();

function key(source: string, entity: string): string {
  return `${source}:${entity}`;
}

export function registerAdapter(adapter: SyncAdapter): void {
  ADAPTERS.set(key(adapter.source, adapter.entity), adapter);
}

export function listAdapters(): SyncAdapter[] {
  return Array.from(ADAPTERS.values());
}

/**
 * Execute a sync job end-to-end:
 *   - create the sync_logs row (status=queued → running)
 *   - delegate to the registered adapter
 *   - update the row with counts + status
 *   - emit an audit log entry
 *
 * The runner does not retry — it surfaces failure status so the caller
 * (cron / queue / route) decides retry policy.
 */
export async function runSyncJob(job: SyncJobInput): Promise<{ logId: string; result: SyncResult }> {
  const adapter = ADAPTERS.get(key(job.source, job.entity));
  if (!adapter) {
    throw new Error(`No sync adapter registered for ${job.source}:${job.entity}`);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run sync jobs');
  }

  const supa = createAdminClient();
  const now = new Date().toISOString();

  const { data: created, error: insertErr } = await supa
    .from('sync_logs')
    .insert({
      source: job.source,
      entity: job.entity,
      status: 'running',
      started_at: now,
      triggered_by: job.triggered_by ?? null,
      integration_id: job.integration_id ?? null,
      cursor: job.cursor ?? null,
      context: job.payload ?? {},
    })
    .select('id')
    .single();
  if (insertErr || !created) {
    throw new Error(`Failed to create sync_logs row: ${insertErr?.message}`);
  }

  const logId = created.id as string;
  await writeAudit({
    action: 'sync.start',
    entity: 'sync_log',
    entity_id: logId,
    payload: { source: job.source, entity: job.entity },
    actor_member_id: job.triggered_by ?? null,
  });

  try {
    const result = await adapter.run({ logId, job });
    const status =
      result.failed > 0 && result.inserted + result.updated > 0 ? 'partial'
      : result.failed > 0 ? 'failed'
      : 'success';

    await supa
      .from('sync_logs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        records_total: result.total,
        records_inserted: result.inserted,
        records_updated: result.updated,
        records_skipped: result.skipped,
        records_failed: result.failed,
        cursor: result.next_cursor ?? null,
        context: { failures: result.failures, ...(job.payload ?? {}) },
      })
      .eq('id', logId);

    await writeAudit({
      action: status === 'success' ? 'sync.success' : `sync.${status}`,
      entity: 'sync_log',
      entity_id: logId,
      payload: { counts: result },
      actor_member_id: job.triggered_by ?? null,
    });

    return { logId, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supa
      .from('sync_logs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: message.slice(0, 4000),
      })
      .eq('id', logId);
    await writeAudit({
      action: 'sync.failed',
      entity: 'sync_log',
      entity_id: logId,
      payload: { error: message },
      actor_member_id: job.triggered_by ?? null,
    });
    throw err;
  }
}
