import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { attendanceSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await requirePermission('attendance.read');
  if (isGuardFailure(actor)) return actor;

  const url = req.nextUrl;
  const supa = await createClient();
  let q = supa
    .from('attendance')
    .select('id, member_id, event_id, club_id, occurred_at, status, check_in_method, notes')
    .order('occurred_at', { ascending: false })
    .limit(Math.min(Number(url.searchParams.get('limit') ?? '100'), 500));
  const event = url.searchParams.get('event_id');
  const member = url.searchParams.get('member_id');
  if (event) q = q.eq('event_id', event);
  if (member) q = q.eq('member_id', member);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data ?? [] });
}

export async function POST(req: NextRequest) {
  const parsed = attendanceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const actor = await requirePermission('attendance.record', {
    club_id: parsed.data.club_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa
    .from('attendance')
    .upsert(
      {
        ...parsed.data,
        occurred_at: parsed.data.occurred_at ?? new Date().toISOString(),
        recorded_by: actor.member_id ?? null,
      },
      { onConflict: 'member_id,event_id' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'attendance.record',
    entity: 'attendance',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { member_id: parsed.data.member_id, event_id: parsed.data.event_id ?? null, status: parsed.data.status },
  });

  return NextResponse.json({ attendance: data }, { status: 201 });
}
