import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(4000).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  location: z.string().max(200).optional(),
  status: z.enum(['planned', 'in_progress', 'done', 'cancelled']).default('planned'),
  is_pinned: z.boolean().default(false),
});

export async function GET() {
  const ctx = await requireZoneChair();
  const { data, error } = await createAdminClient()
    .from('zone_agenda')
    .select('*, owner:members(name)')
    .eq('zone_id', ctx.zone.id)
    .order('is_pinned', { ascending: false })
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agenda: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== '' && v !== null));
  const { data, error } = await createAdminClient()
    .from('zone_agenda')
    .insert({ ...payload, zone_id: ctx.zone.id, created_by: ctx.member.id })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
