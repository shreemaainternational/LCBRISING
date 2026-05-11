import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await requirePermission('sync.configure');
  if (isGuardFailure(actor)) return actor;

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '50'), 200);
  const entity = req.nextUrl.searchParams.get('entity');

  const supa = await createClient();
  let q = supa
    .from('sync_logs')
    .select('id, source, entity, status, started_at, finished_at, records_total, records_inserted, records_updated, records_failed, error_message')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (entity) q = q.eq('entity', entity);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
