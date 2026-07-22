import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function caDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

const caUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(32).optional(),
});

/** PATCH /api/constitutional-areas/[id] — edit a constitutional area. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const parsed = caUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const payload: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(parsed.data)) {
    if (val !== undefined) payload[k] = val === '' ? null : val;
  }
  if (Object.keys(payload).length === 0) return NextResponse.json({ ok: true });

  const { id } = await params;
  const supa = caDb() ?? await createClient();
  const { data, error } = await supa.from('constitutional_areas').update(payload).eq('id', id).select().single();
  if (error) {
    const dup = /duplicate key/i.test(error.message);
    return NextResponse.json(
      { error: dup ? 'A constitutional area with that code already exists.' : error.message },
      { status: dup ? 409 : 500 },
    );
  }

  await writeAudit({
    action: 'constitutional_area.update', entity: 'constitutional_area', entity_id: id,
    actor_member_id: actor?.id ?? null, diff: { after: payload },
  });
  return NextResponse.json({ constitutional_area: data });
}

/** DELETE /api/constitutional-areas/[id] — soft-delete, blocked while MDs reference it. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const { id } = await params;
  const supa = caDb() ?? await createClient();

  const { count } = await supa
    .from('multiple_districts').select('id', { count: 'exact', head: true })
    .eq('constitutional_area_id', id).is('deleted_at', null);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Can't remove this constitutional area — ${count} multiple district(s) still belong to it. Reassign or remove them first.` },
      { status: 409 },
    );
  }

  const { error } = await supa
    .from('constitutional_areas').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    const msg = /row.level security|permission denied/i.test(error.message)
      ? 'Row-level security blocked the delete. Apply migration 0073_constitutional_areas.sql or set SUPABASE_SERVICE_ROLE_KEY.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await writeAudit({
    action: 'constitutional_area.delete', entity: 'constitutional_area', entity_id: id,
    actor_member_id: actor?.id ?? null, payload: { soft_delete: true },
  });
  return NextResponse.json({ ok: true });
}
