import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  details: z.string().max(4000).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'blocked', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  owner_member_id: z.string().uuid().nullable().optional(),
  owner_name: z.string().max(200).optional().nullable(),
  watchers: z.array(z.string().uuid()).optional(),
  due_date: z.string().optional().nullable(),
  blocked_reason: z.string().max(400).optional().nullable(),
  remind_channel: z.enum(['email', 'whatsapp', 'sms', 'push']).optional(),
  remind_when_due_in_days: z.number().int().min(0).max(30).optional(),
  is_pinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db.from('zone_action_items').select('zone_id, status').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'done' && existing.status !== 'done') {
    patch.done_at = new Date().toISOString();
  } else if (parsed.data.status && parsed.data.status !== 'done' && existing.status === 'done') {
    patch.done_at = null;
  }

  const { data, error } = await db.from('zone_action_items').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: existing } = await db.from('zone_action_items').select('zone_id').eq('id', id).maybeSingle();
  if (!existing || existing.zone_id !== zone.zone.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await db.from('zone_action_items').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
