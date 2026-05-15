import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { runSyncJob, type SyncEntity } from '@/lib/sync';

export const dynamic = 'force-dynamic';

const ALLOWED: SyncEntity[] = [
  'members',
  'clubs',
  'officers',
  'attendance',
  'donations',
  'activities',
  'events',
];

/**
 * multipart/form-data upload:
 *   field `entity` — 'members' | 'clubs'
 *   field `file`   — the CSV file
 *
 * RBAC: requires `sync.trigger`.
 */
export async function POST(req: NextRequest) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;

  const form = await req.formData();
  const entity = String(form.get('entity') ?? '') as SyncEntity;
  const file = form.get('file');

  if (!ALLOWED.includes(entity)) {
    return NextResponse.json({ error: 'invalid_entity', allowed: ALLOWED }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const csv = await file.text();
  try {
    const { logId, result } = await runSyncJob({
      source: 'csv',
      entity,
      payload: { csv, filename: file.name },
      triggered_by: actor.member_id ?? null,
    });
    return NextResponse.json({ ok: true, log_id: logId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'csv_sync_failed';
    return NextResponse.json({ error: 'csv_sync_failed', message }, { status: 500 });
  }
}
