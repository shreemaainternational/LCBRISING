import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { transferSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = transferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  // Trusted admin write (gated by requirePermission below). Service-role client
  // so member reads/writes bypass RLS and avoid the members-policy recursion.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data: before } = await supa
    .from('members')
    .select('id, club_id, district_id, name, email')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('member.transfer', {
    club_id: before.club_id ?? null,
    district_id: before.district_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  const { error } = await supa
    .from('members')
    .update({
      club_id: parsed.data.to_club_id,
      district_id: parsed.data.to_district_id ?? null,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'member.transfer',
    entity: 'member',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: {
      from_club_id: before.club_id,
      from_district_id: before.district_id,
      to_club_id: parsed.data.to_club_id,
      to_district_id: parsed.data.to_district_id ?? null,
      effective_on: parsed.data.effective_on ?? null,
      reason: parsed.data.reason ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
