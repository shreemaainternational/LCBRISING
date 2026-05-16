import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  scope: z.string().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
  all_day: z.boolean().optional(),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  host_name: z.string().max(200).optional().nullable(),
  announced_by: z.string().max(200).optional().nullable(),
  source_url: z.string().url().optional().or(z.literal('')).nullable(),
  rsvp_required: z.boolean().optional(),
  color: z.string().max(20).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const db = createAdminClient();
  const { data: existing } = await db.from('lions_calendar').select('zone_id').eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.zone_id && existing.zone_id !== zone.zone.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { data, error } = await db.from('lions_calendar').update(parsed.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: existing } = await db.from('lions_calendar').select('zone_id').eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.zone_id && existing.zone_id !== zone.zone.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await db.from('lions_calendar').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
