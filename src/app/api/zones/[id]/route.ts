import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function zoneDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

/** DELETE /api/zones/[id] — soft-delete a zone. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const { id } = await params;
  const supa = zoneDb() ?? await createClient();

  // Lions hierarchy: a zone can't be removed while clubs are still assigned
  // to it — reassign or remove those clubs first (no orphaned clubs).
  const { count } = await supa
    .from('clubs')
    .select('id', { count: 'exact', head: true })
    .eq('zone_id', id)
    .is('deleted_at', null);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Can't remove this zone — ${count} club(s) are still assigned. Reassign or remove them first.` },
      { status: 409 },
    );
  }

  const { error } = await supa
    .from('zones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    const msg = /row.level security|permission denied/i.test(error.message)
      ? 'Row-level security blocked the delete. Apply migration 0037_federation_rls.sql or set SUPABASE_SERVICE_ROLE_KEY.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await writeAudit({
    action: 'zone.delete',
    entity: 'zone',
    entity_id: id,
    actor_member_id: actor?.id ?? null,
    payload: { soft_delete: true },
  });

  return NextResponse.json({ ok: true });
}
