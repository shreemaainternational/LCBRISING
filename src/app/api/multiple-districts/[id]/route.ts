import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mdDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

const mdUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(32).optional(),
  country: z.string().max(120).nullable().optional(),
  council_chairperson_name: z.string().max(200).nullable().optional(),
  constitutional_area_id: z.string().uuid().nullable().optional(),
});

/** PATCH /api/multiple-districts/[id] — edit a multiple district. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const parsed = mdUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const payload: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(parsed.data)) {
    if (val !== undefined) payload[k] = val === '' ? null : val;
  }
  if (Object.keys(payload).length === 0) return NextResponse.json({ ok: true });

  const { id } = await params;
  const supa = mdDb() ?? await createClient();
  const { data, error } = await supa.from('multiple_districts').update(payload).eq('id', id).select().single();
  if (error) {
    const dup = /duplicate key/i.test(error.message);
    return NextResponse.json(
      { error: dup ? 'A multiple district with that code already exists.' : error.message },
      { status: dup ? 409 : 500 },
    );
  }

  await writeAudit({
    action: 'multiple_district.update', entity: 'multiple_district', entity_id: id,
    actor_member_id: actor?.id ?? null, diff: { after: payload },
  });
  return NextResponse.json({ multiple_district: data });
}

/** DELETE /api/multiple-districts/[id] — soft-delete, blocked while districts reference it. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const { id } = await params;
  const supa = mdDb() ?? await createClient();

  // Lions hierarchy: a multiple district can't be removed while districts belong to it.
  const { count } = await supa
    .from('districts').select('id', { count: 'exact', head: true })
    .eq('multiple_district_id', id).is('deleted_at', null);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Can't remove this multiple district — ${count} district(s) still belong to it. Reassign or remove them first.` },
      { status: 409 },
    );
  }

  const { error } = await supa
    .from('multiple_districts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    const msg = /row.level security|permission denied/i.test(error.message)
      ? 'Row-level security blocked the delete. Apply migration 0037_federation_rls.sql or set SUPABASE_SERVICE_ROLE_KEY.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await writeAudit({
    action: 'multiple_district.delete', entity: 'multiple_district', entity_id: id,
    actor_member_id: actor?.id ?? null, payload: { soft_delete: true },
  });
  return NextResponse.json({ ok: true });
}
