import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  club_ids: z.array(z.string().uuid()).min(1).max(200),
  to_zone_id: z.string().uuid().nullable(),
  reason: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db.from('clubs')
    .select('id, zone_id, region_id, district_id, name')
    .in('id', parsed.data.club_ids);
  if (!existing?.length) return NextResponse.json({ error: 'no_clubs_found' }, { status: 404 });

  let toZone: { id: string; region_id: string | null; district_id: string } | null = null;
  if (parsed.data.to_zone_id) {
    const { data: z } = await db.from('zones')
      .select('id, region_id, district_id').eq('id', parsed.data.to_zone_id).maybeSingle();
    if (!z) return NextResponse.json({ error: 'zone_not_found' }, { status: 404 });
    toZone = z;
  }

  const auditRows = existing.map((c) => ({
    club_id: c.id,
    action: parsed.data.to_zone_id ? (c.zone_id ? 'reassigned' : 'assigned') : 'unassigned',
    from_zone_id: c.zone_id ?? null,
    to_zone_id: toZone?.id ?? null,
    from_region_id: c.region_id ?? null,
    to_region_id: toZone?.region_id ?? null,
    from_district_id: c.district_id ?? null,
    to_district_id: toZone?.district_id ?? c.district_id ?? null,
    reason: parsed.data.reason ?? null,
    performed_by: actor?.id ?? null,
  }));

  const update: Record<string, unknown> = { zone_id: toZone?.id ?? null };
  if (toZone?.region_id) update.region_id = toZone.region_id;
  if (toZone?.district_id) update.district_id = toZone.district_id;

  const { error: upErr } = await db.from('clubs').update(update).in('id', parsed.data.club_ids);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await db.from('club_assignment_history').insert(auditRows);

  return NextResponse.json({
    ok: true,
    reassigned: existing.length,
    moves: auditRows.map((r) => ({ club_id: r.club_id, from: r.from_zone_id, to: r.to_zone_id })),
  });
}
