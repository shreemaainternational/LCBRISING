import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  lions_year: z.string().min(4).max(16),
  title: z.string().min(1).max(200),
  category: z.enum([
    'service_week','dg_visit','cabinet_meeting','zone_meeting','club_meeting',
    'installation','charter_anniversary','mega_project','regional_conference',
    'multiple_district_conference','lions_international_convention','training',
    'membership_drive','fundraiser','social','awards_night','leo_event',
    'special_day','holiday','other',
  ]).default('other'),
  scope: z.enum(['international','multiple_district','district','region','zone','club']).default('zone'),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  all_day: z.boolean().default(false),
  location: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  host_name: z.string().max(200).optional(),
  announced_by: z.string().max(200).optional(),
  source_url: z.string().url().optional().or(z.literal('')),
  rsvp_required: z.boolean().default(false),
  color: z.string().max(20).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  const ctx = await requireZoneChair();
  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const db = createAdminClient();
  let q = db.from('lions_calendar').select('*')
    .is('deleted_at', null)
    .or(`zone_id.eq.${ctx.zone.id},zone_id.is.null`)
    .order('starts_at', { ascending: true });
  if (year) q = q.eq('lions_year', year);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ''));
  const { data, error } = await createAdminClient().from('lions_calendar').insert({
    ...payload,
    zone_id: ctx.zone.id,
    district_id: ctx.zone.district_id,
    created_by: ctx.member.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
