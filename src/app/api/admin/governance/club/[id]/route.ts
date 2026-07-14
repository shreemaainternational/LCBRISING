import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  category: z.string().max(64).nullable().optional(),
  assistant_chair_member_id: z.string().uuid().nullable().optional(),
  governance_notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();
  const { data: before } = await db.from('clubs')
    .select('category, assistant_chair_member_id, governance_notes').eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await db.from('clubs').update(parsed.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit each meaningful change.
  const auditRows: Array<Record<string, unknown>> = [];
  if (parsed.data.category != null && parsed.data.category !== before.category) {
    auditRows.push({
      club_id: id, action: 'category_changed',
      changed_field: 'category',
      changed_from: before.category ?? null, changed_to: parsed.data.category,
      performed_by: actor?.id ?? null,
    });
  }
  if ('assistant_chair_member_id' in parsed.data && parsed.data.assistant_chair_member_id !== before.assistant_chair_member_id) {
    auditRows.push({
      club_id: id, action: 'chair_changed',
      changed_field: 'assistant_chair_member_id',
      changed_from: before.assistant_chair_member_id ?? null,
      changed_to: parsed.data.assistant_chair_member_id ?? null,
      performed_by: actor?.id ?? null,
    });
  }
  if (auditRows.length) await db.from('club_assignment_history').insert(auditRows);

  return NextResponse.json({ club: data });
}
