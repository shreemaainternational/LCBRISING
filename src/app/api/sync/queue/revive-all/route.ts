import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/sync/queue/revive-all — flip every dead/failed job back to pending. */
export async function POST() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const db = createAdminClient();
  const { data, error } = await db.from('sync_queue')
    .update({
      status: 'pending',
      next_retry_at: new Date().toISOString(),
      last_error: null,
    })
    .in('status', ['dead', 'failed'])
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, revived: data?.length ?? 0 });
}
