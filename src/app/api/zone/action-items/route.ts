import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(300),
  details: z.string().max(4000).optional(),
  status: z.enum(['open', 'in_progress', 'blocked', 'done', 'cancelled']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  owner_member_id: z.string().uuid().nullable().optional(),
  owner_name: z.string().max(200).optional(),
  watchers: z.array(z.string().uuid()).optional(),
  due_date: z.string().optional().nullable(),
  blocked_reason: z.string().max(400).optional(),
  remind_channel: z.enum(['email', 'whatsapp', 'sms', 'push']).default('email'),
  remind_when_due_in_days: z.number().int().min(0).max(30).default(1),
  is_pinned: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  agenda_id: z.string().uuid().nullable().optional(),
  minutes_id: z.string().uuid().nullable().optional(),
  club_id: z.string().uuid().nullable().optional(),
});

export async function GET(req: Request) {
  const ctx = await requireZoneChair();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner');

  const db = createAdminClient();
  let q = db.from('zone_action_items')
    .select('*, owner:members!zone_action_items_owner_member_id_fkey(name,email), club:clubs(name)')
    .eq('zone_id', ctx.zone.id);
  if (status) q = q.eq('status', status);
  if (owner)  q = q.eq('owner_member_id', owner);
  const { data, error } = await q
    .order('is_pinned', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ''));
  const { data, error } = await createAdminClient()
    .from('zone_action_items')
    .insert({
      ...payload,
      zone_id: ctx.zone.id,
      district_id: ctx.zone.district_id,
      region_id: ctx.zone.region_id,
      created_by: ctx.member.id,
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
