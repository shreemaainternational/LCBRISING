import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  zone_id: z.string().uuid(),
  district_id: z.string().uuid().optional().nullable(),
  club_id: z.string().uuid().nullable().optional(),
  priority: z.enum(['info', 'warning', 'critical']).default('warning'),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  action_required: z.string().max(400).optional().nullable(),
});

export async function POST(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.zone_id !== ctx.zone.id) return NextResponse.json({ error: 'wrong_zone' }, { status: 403 });

  const { data, error } = await createAdminClient().from('advisories').insert({
    ...parsed.data,
    sent_by: ctx.member.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ advisory: data }, { status: 201 });
}
