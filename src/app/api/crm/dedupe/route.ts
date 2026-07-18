import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { scanAllDuplicates } from '@/lib/dedupe/scan';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const actor = await requirePermission('member.read');
  if (isGuardFailure(actor)) return actor;
  return NextResponse.json(await scanAllDuplicates());
}

const mergeSchema = z.object({
  entity: z.enum(['member', 'activity', 'event']),
  keep_id: z.string().uuid(),
  drop_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { entity, keep_id, drop_id } = parsed.data;
  if (keep_id === drop_id) return NextResponse.json({ error: 'keep and drop are the same' }, { status: 400 });

  // Activities have no dedicated permission; gate them with event.update
  // (both are club-content edits at the same tier).
  const perm = entity === 'member' ? 'member.update' : 'event.update';
  const actor = await requirePermission(perm);
  if (isGuardFailure(actor)) return actor;

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  // Best-effort reassignment of a FK from the dropped row to the kept row.
  const reassign = async (table: string, col: string, extraNullCol?: string) => {
    try {
      let q = db.from(table).update({ [col]: keep_id }).eq(col, drop_id);
      if (extraNullCol) q = q.is(extraNullCol, null);
      await q;
    } catch { /* table may not exist / unique conflict — ignore */ }
  };

  try {
    if (entity === 'member') {
      const { data: keep } = await db.from('members').select('*').eq('id', keep_id).maybeSingle();
      const { data: drop } = await db.from('members').select('*').eq('id', drop_id).maybeSingle();
      if (!keep || !drop) return NextResponse.json({ error: 'not_found' }, { status: 404 });

      // Backfill the kept record's empty fields from the dropped one.
      const patch: Record<string, unknown> = {};
      for (const f of ['lions_member_id', 'phone', 'whatsapp', 'club_id', 'district_id', 'birthday', 'avatar_url', 'lions_role']) {
        if ((keep[f] == null || keep[f] === '') && drop[f] != null && drop[f] !== '') patch[f] = drop[f];
      }
      if (Object.keys(patch).length) {
        // Clear the dropped row's unique lions_member_id first to avoid a clash.
        if (patch.lions_member_id) await db.from('members').update({ lions_member_id: null }).eq('id', drop_id);
        await db.from('members').update(patch).eq('id', keep_id);
      }
      // Move relationships onto the kept member.
      await reassign('officers', 'member_id');
      await reassign('dues', 'member_id');
      await reassign('dues_invoices', 'member_id');
      await reassign('payments', 'member_id');
      // Soft-delete the duplicate (reversible; avoids cascade deletes).
      const { error } = await db.from('members').update({ deleted_at: new Date().toISOString() }).eq('id', drop_id);
      if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
    } else if (entity === 'event') {
      await reassign('event_rsvps', 'event_id');
      await reassign('attendance', 'event_id');
      const { error } = await db.from('events').delete().eq('id', drop_id);
      if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
    } else {
      // activity — references use ON DELETE SET NULL, so a plain delete is safe.
      const { error } = await db.from('activities').delete().eq('id', drop_id);
      if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
    }

    await writeAudit({
      action: `${entity}.merge`, entity, entity_id: keep_id,
      actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
      payload: { kept: keep_id, merged: drop_id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'merge_failed' }, { status: 500 });
  }
}
