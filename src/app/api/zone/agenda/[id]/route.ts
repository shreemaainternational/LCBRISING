import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(4000).optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  status: z.enum(['planned', 'in_progress', 'done', 'cancelled']).optional(),
  is_pinned: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();
  // Verify the row belongs to the chair's zone.
  const { data: existing } = await db.from('zone_agenda').select('zone_id').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data, error } = await db.from('zone_agenda').update(parsed.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: existing } = await db.from('zone_agenda').select('zone_id').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  await db.from('zone_agenda').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
