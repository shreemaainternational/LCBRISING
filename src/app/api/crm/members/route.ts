import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAuthorizedWriteClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { enterpriseMemberSchema } from '@/lib/validation/schemas';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const actor = await requirePermission('member.read');
  if (isGuardFailure(actor)) return actor;

  const url = req.nextUrl;
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const q = url.searchParams.get('q');
  const clubId = url.searchParams.get('club_id');
  const districtId = url.searchParams.get('district_id');

  const supa = await createClient();
  let query = supa
    .from('members')
    .select('id, name, email, phone, whatsapp, club_id, district_id, lions_role, lions_member_id, status, joined_at, last_sync_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('name')
    .range(offset, offset + limit - 1);
  if (clubId) query = query.eq('club_id', clubId);
  if (districtId) query = query.eq('district_id', districtId);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,lions_member_id.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [], total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = enterpriseMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('member.create', {
    club_id: parsed.data.club_id ?? null,
    district_id: parsed.data.district_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  // Trusted write (already gated by requirePermission). Prefer the
  // service-role client so the INSERT and its `.select()` read-back bypass
  // RLS: reading the row back applies the self-referential members SELECT
  // policy, which trips the infinite recursion on databases missing
  // migration 0059.
  const supa = await createAuthorizedWriteClient();
  const { data, error } = await supa.from('members').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'member.create',
    entity: 'member',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { email: parsed.data.email, club_id: parsed.data.club_id ?? null },
  });

  return NextResponse.json({ member: data }, { status: 201 });
}
