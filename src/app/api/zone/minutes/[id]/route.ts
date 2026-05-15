import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  meeting_date: z.string().datetime().optional(),
  venue: z.string().max(200).optional().nullable(),
  attendees: z.array(z.string()).optional(),
  apologies: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  action_items: z.array(z.object({
    task: z.string(),
    owner: z.string().optional(),
    due_date: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'done']).optional(),
  })).optional(),
  next_meeting_at: z.string().datetime().optional().nullable(),
  notes_md: z.string().max(20000).optional().nullable(),
  attachment_urls: z.array(z.string().url()).optional(),
  signOff: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const { data, error } = await createAdminClient()
    .from('zone_meeting_minutes').select('*').eq('id', id).eq('zone_id', zone.zone.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ minutes: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db.from('zone_meeting_minutes').select('zone_id, signed_off_at').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { signOff, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if (signOff && !existing.signed_off_at) {
    patch.signed_off_by = zone.member.id;
    patch.signed_off_at = new Date().toISOString();
  }
  const { data, error } = await db.from('zone_meeting_minutes').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ minutes: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: existing } = await db.from('zone_meeting_minutes').select('zone_id').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await db.from('zone_meeting_minutes').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
