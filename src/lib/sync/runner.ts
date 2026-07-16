import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import type { SyncAdapter, SyncJobInput, SyncResult } from './types';

const ADAPTERS = new Map<string, SyncAdapter>();

function key(source: string, entity: string): string {
  return `${source}:${entity}`;
}

/**
 * Strip characters Postgres' jsonb type rejects. A U+0000 (NUL) byte —
 * common when a binary upload (e.g. an .xlsx workbook) is read as text —
 * makes jsonb inserts fail with "unsupported Unicode escape sequence", and
 * lone UTF-16 surrogates are invalid too. Applied recursively to anything
 * we persist into a jsonb column.
 */
function sanitizeForJsonb<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '').replace(/[\uD800-\uDFFF]/g, '') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForJsonb(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForJsonb(v);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Build the jsonb `context` for a sync_logs row. The raw upload payload can
 * be megabytes of CSV/spreadsheet text (and may contain NUL bytes), so we
 * never store it verbatim — only lightweight, sanitized metadata.
 */
function logContext(payload: Record<string, unknown> | undefined, extra?: Record<string, unknown>) {
  const { csv, ...meta } = payload ?? {};
  const size = typeof csv === 'string' ? csv.length : undefined;
  return sanitizeForJsonb({ ...meta, ...(size !== undefined ? { csv_length: size } : {}), ...extra });
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
      context: logContext(job.payload),
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
        context: logContext(job.payload, { failures: result.failures }),
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
        error_message: sanitizeForJsonb(message).slice(0, 4000),
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
