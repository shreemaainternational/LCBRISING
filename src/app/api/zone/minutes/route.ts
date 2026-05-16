import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const actionItemSchema = z.object({
  task: z.string(),
  owner: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'done']).default('open'),
});

const createSchema = z.object({
  agenda_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  meeting_date: z.string().datetime().optional(),
  venue: z.string().max(200).optional(),
  attendees: z.array(z.string()).default([]),
  apologies: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  action_items: z.array(actionItemSchema).default([]),
  next_meeting_at: z.string().datetime().optional().nullable(),
  notes_md: z.string().max(20000).optional(),
  attachment_urls: z.array(z.string().url()).default([]),
});

export async function GET() {
  const ctx = await requireZoneChair();
  const { data, error } = await createAdminClient()
    .from('zone_meeting_minutes')
    .select('*, agenda:zone_agenda(title, scheduled_at), signed_off:members!zone_meeting_minutes_signed_off_by_fkey(name)')
    .eq('zone_id', ctx.zone.id)
    .order('meeting_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ minutes: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from('zone_meeting_minutes')
    .insert({ ...parsed.data, zone_id: ctx.zone.id, created_by: ctx.member.id })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ minutes: data }, { status: 201 });
}
