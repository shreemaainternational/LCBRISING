import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { districtSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Trusted admin reads/writes (gated by requirePermission at each call site).
// Prefer the service-role client so queries bypass RLS on databases where the
// federation RLS policies aren't fully applied — the `districts` policies
// sub-select `members`, which recurses ("infinite recursion detected in policy
// for relation members") until migration 0059 is applied. Fall back to the
// SSR session when no service-role key is configured.
function districtDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

export async function GET() {
  const actor = await requirePermission('district.read');
  if (isGuardFailure(actor)) return actor;
  const supa = districtDb() ?? await createClient();
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

  const supa = districtDb() ?? await createClient();

  // A district with this code may already exist but be hidden from the list —
  // most often soft-deleted (deleted_at set). The unique constraint on `code`
  // is global, so a plain insert then fails with a cryptic duplicate-key error
  // even though the page shows "No districts yet". Reconcile explicitly:
  //   - soft-deleted match  → revive it (clear deleted_at) and apply the edits
  //   - active match        → friendly 409
  const { data: existing } = await supa
    .from('districts')
    .select('id, deleted_at')
    .eq('code', parsed.data.code)
    .maybeSingle();

  if (existing?.deleted_at) {
    const { data, error } = await supa
      .from('districts')
      .update({ ...parsed.data, deleted_at: null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAudit({
      action: 'district.revive',
      entity: 'district',
      entity_id: data.id,
      actor_user_id: actor.user_id,
      actor_member_id: actor.member_id ?? null,
      payload: { code: parsed.data.code },
    });
    return NextResponse.json({ district: data, revived: true }, { status: 200 });
  }
  if (existing) {
    return NextResponse.json(
      { error: `A district with code "${parsed.data.code}" already exists.` },
      { status: 409 },
    );
  }

  const { data, error } = await supa.from('districts').insert(parsed.data).select().single();
  if (error) {
    const msg = (error as { code?: string }).code === '23505'
      ? `A district with code "${parsed.data.code}" already exists.`
      : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === '23505' ? 409 : 500 });
  }

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
