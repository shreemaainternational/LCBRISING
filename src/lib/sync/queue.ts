/**
 * Durable sync queue with exponential-backoff retry. Wraps the
 * adapter runner in `src/lib/sync/runner.ts` so any code path can
 * schedule a sync job and a single cron worker drains it.
 *
 * Retry policy: 2 ** attempts minutes, capped at 60. After
 * max_attempts the job moves to status 'dead' and stays there until
 * an admin force-retries it.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { runSyncJob } from './runner';
import type { SyncEntity, SyncJobInput, SyncResult } from './types';

export interface EnqueueArgs {
  source: SyncJobInput['source'];
  entity: SyncEntity;
  operation?: string;
  entity_id?: string | null;
  external_id?: string | null;
  payload?: Record<string, unknown>;
  priority?: number;
  max_attempts?: number;
  triggered_by?: string | null;
  delay_seconds?: number;
}

export interface QueueRow {
  id: string;
  source: string;
  entity: SyncEntity;
  operation: string;
  entity_id: string | null;
  external_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  triggered_by: string | null;
}

export async function enqueueSync(args: EnqueueArgs): Promise<string> {
  const db = createAdminClient();
  const nextRetry = new Date(Date.now() + (args.delay_seconds ?? 0) * 1000).toISOString();
  const { data, error } = await db.from('sync_queue').insert({
    source: args.source,
    entity: args.entity,
    operation: args.operation ?? 'sync',
    entity_id: args.entity_id ?? null,
    external_id: args.external_id ?? null,
    payload: args.payload ?? {},
    priority: args.priority ?? 100,
    max_attempts: args.max_attempts ?? 5,
    next_retry_at: nextRetry,
    triggered_by: args.triggered_by ?? null,
  }).select('id').single();
  if (error) throw new Error(`enqueue_failed: ${error.message}`);
  return data!.id as string;
}

export interface DrainResult {
  claimed: number;
  done: number;
  failed: number;
  dead: number;
  results: { id: string; entity: string; status: string; error?: string }[];
}

/**
 * Claim up to `limit` ready jobs and run them sequentially. Uses an
 * UPDATE … RETURNING with a now() filter so two workers never claim
 * the same row.
 */
export async function drainQueue(limit = 25, workerId = `worker-${Date.now()}`): Promise<DrainResult> {
  const db = createAdminClient();
  const result: DrainResult = { claimed: 0, done: 0, failed: 0, dead: 0, results: [] };

  // Two-step claim: select candidates, then atomic update with eq() on status.
  // Postgres RLS prevents two workers from clobbering because admin client
  // is bypassed but the WHERE status='pending' AND id=... is idempotent.
  const { data: candidates } = await db.from('sync_queue')
    .select('id, source, entity, operation, entity_id, external_id, payload, attempts, max_attempts, triggered_by')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  for (const c of (candidates ?? []) as unknown as QueueRow[]) {
    const { data: claimed } = await db.from('sync_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        claimed_by: workerId,
        attempts: c.attempts + 1,
      })
      .eq('id', c.id).eq('status', 'pending')
      .select('id').maybeSingle();
    if (!claimed) continue;
    result.claimed++;

    try {
      const { logId, result: runRes } = await runSyncJob({
        source: c.source as SyncJobInput['source'],
        entity: c.entity,
        triggered_by: c.triggered_by,
        payload: c.payload,
      });

      const success = runRes.failed === 0;
      await db.from('sync_queue').update({
        status: success ? 'done' : (c.attempts + 1 >= c.max_attempts ? 'dead' : 'pending'),
        last_log_id: logId,
        last_error: success ? null : summarizeFailures(runRes),
        finished_at: success ? new Date().toISOString() : null,
        next_retry_at: success ? new Date().toISOString() : nextBackoffISO(c.attempts + 1),
      }).eq('id', c.id);

      await upsertLedger(c, runRes, success);

      result.done += success ? 1 : 0;
      result.failed += success ? 0 : 1;
      if (!success && c.attempts + 1 >= c.max_attempts) result.dead++;
      result.results.push({ id: c.id, entity: c.entity, status: success ? 'done' : 'failed', error: success ? undefined : summarizeFailures(runRes) });
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      const isLast = c.attempts + 1 >= c.max_attempts;
      await db.from('sync_queue').update({
        status: isLast ? 'dead' : 'pending',
        last_error: msg.slice(0, 1000),
        next_retry_at: nextBackoffISO(c.attempts + 1),
      }).eq('id', c.id);

      if (c.entity_id) {
        await db.from('sync_ledger').upsert({
          entity: c.entity, entity_id: c.entity_id,
          last_status: 'error', last_attempt_at: new Date().toISOString(),
          last_error: msg.slice(0, 500),
          attempts: c.attempts + 1,
        }, { onConflict: 'entity,entity_id' });
      }
      result.failed++;
      if (isLast) result.dead++;
      result.results.push({ id: c.id, entity: c.entity, status: 'failed', error: msg });
    }
  }
  return result;
}

function nextBackoffISO(attempts: number): string {
  const minutes = Math.min(60, 2 ** Math.min(attempts, 6));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function summarizeFailures(r: SyncResult): string {
  if (r.failed === 0) return '';
  const head = r.failures.slice(0, 3).map((f) => `row ${f.row}: ${f.reason}`).join('; ');
  return `${r.failed} failure(s)${head ? ` — ${head}` : ''}`;
}

async function upsertLedger(row: QueueRow, runRes: SyncResult, success: boolean) {
  if (!row.entity_id) return;
  const db = createAdminClient();
  await db.from('sync_ledger').upsert({
    entity: row.entity,
    entity_id: row.entity_id,
    external_id: row.external_id,
    last_status: success ? 'synced' : 'error',
    last_synced_at: success ? new Date().toISOString() : null,
    last_attempt_at: new Date().toISOString(),
    last_error: success ? null : summarizeFailures(runRes).slice(0, 500),
    attempts: row.attempts + 1,
  }, { onConflict: 'entity,entity_id' });
}

export async function reviveDeadJob(id: string, max_attempts?: number): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from('sync_queue').update({
    status: 'pending',
    next_retry_at: new Date().toISOString(),
    last_error: null,
    max_attempts: max_attempts ?? 5,
  }).eq('id', id).in('status', ['dead', 'failed']);
  return !error;
}
