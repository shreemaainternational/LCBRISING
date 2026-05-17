import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { integrations } from '@/lib/env';
import { assessClubHealth, assessZoneClubs, assessAllClubs, persistClubHealth, aiClubCommentary } from '@/lib/club-health';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  scope: z.enum(['club', 'zone', 'all']).default('all'),
  club_id: z.string().uuid().optional(),
  zone_id: z.string().uuid().optional(),
  with_ai: z.boolean().default(false),
});

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();

  let assessments;
  if (parsed.data.scope === 'club' && parsed.data.club_id) {
    const a = await assessClubHealth(parsed.data.club_id);
    assessments = a ? [a] : [];
  } else if (parsed.data.scope === 'zone' && parsed.data.zone_id) {
    assessments = await assessZoneClubs(parsed.data.zone_id);
  } else {
    assessments = await assessAllClubs();
  }

  // Optional AI commentary — only when explicitly requested & OpenAI is set up.
  if (parsed.data.with_ai && integrations.openai) {
    const { data: names } = await db.from('clubs').select('id, name').in('id', assessments.map((a) => a.clubId));
    const nameByClub = new Map((names ?? []).map((c) => [c.id, c.name]));
    for (const a of assessments) {
      a.commentary = await aiClubCommentary(a, nameByClub.get(a.clubId) ?? 'Club');
    }
  }

  await Promise.all(assessments.map((a) => persistClubHealth(a)));

  return NextResponse.json({
    ok: true,
    count: assessments.length,
    assessments,
  });
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { data } = await createAdminClient().from('clubs')
    .select('id, name, club_number, zone_id, health_score, health_assessed_at, health_commentary')
    .is('deleted_at', null)
    .order('health_score', { ascending: true, nullsFirst: true });
  return NextResponse.json({ clubs: data ?? [] });
}
