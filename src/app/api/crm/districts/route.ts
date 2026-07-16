import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAuthorizedWriteClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { districtSchema } from '@/lib/validation/schemas';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requirePermission('district.read');
  if (isGuardFailure(actor)) return actor;
  const supa = await createClient();
  const { data, error } = await supa
    .from('districts')
    .select('id, code, name, governor_name, lions_year, multiple_district_id, created_at')
    .is('deleted_at', null)
    .order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ districts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const parsed = districtSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  // Creating a district is a higher-tier action; we re-use district.update
  // permission (district_governor+).
  const actor = await requirePermission('district.update');
  if (isGuardFailure(actor)) return actor;

  // Trusted write (already gated by requirePermission). Prefer the
  // service-role client so the INSERT and its read-back bypass RLS: the
  // districts_admin_write policy sub-selects public.members, which trips the
  // members-policy infinite recursion on databases missing migration 0059.
  const supa = await createAuthorizedWriteClient();
  const { data, error } = await supa.from('districts').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'district.create',
    entity: 'district',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { code: parsed.data.code },
  });

  return NextResponse.json({ district: data }, { status: 201 });
}
