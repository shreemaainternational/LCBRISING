import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireZoneChair } from '@/lib/zone-portal';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireZoneChair();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  // Verify the activity belongs to a club in the caller's zone.
  const { data: activity } = await db.from('activities')
    .select('id, club_id, title, clubs(zone_id, name)')
    .eq('id', id).maybeSingle();
  if (!activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const clubZone = (activity.clubs as { zone_id?: string } | null)?.zone_id;
  if (clubZone !== ctx.zone.id && ctx.member.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden_wrong_zone' }, { status: 403 });
  }

  const status =
    parsed.data.action === 'approve' ? 'approved' :
    parsed.data.action === 'reject'  ? 'rejected' : 'changes_requested';

  const { error } = await db.from('activities').update({
    approval_status: status,
    approval_notes: parsed.data.notes ?? null,
    approved_by_member_id: ctx.member.id,
    approved_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit trail (best-effort).
  try {
    await db.from('audit_logs').insert({
      actor_member_id: ctx.member.id,
      entity: 'activity',
      entity_id: id,
      action: `approval_${parsed.data.action}`,
      payload: { notes: parsed.data.notes ?? null, zone_id: ctx.zone.id, title: activity.title },
    });
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, status });
}
