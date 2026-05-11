import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await requirePermission('audit.read');
  if (isGuardFailure(actor)) return actor;

  const url = req.nextUrl;
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);
  const action = url.searchParams.get('action');
  const entity = url.searchParams.get('entity');
  const actorMember = url.searchParams.get('actor_member_id');

  const supa = await createClient();
  let q = supa
    .from('audit_logs')
    .select('id, action, entity, entity_id, actor_member_id, actor_label, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (action) q = q.eq('action', action);
  if (entity) q = q.eq('entity', entity);
  if (actorMember) q = q.eq('actor_member_id', actorMember);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
