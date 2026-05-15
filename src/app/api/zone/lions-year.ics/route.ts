import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';
import { buildIcs } from '@/lib/ics';
import { CATEGORY_META, SCOPE_META, lionsYearFor } from '@/lib/lions-calendar-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/zone/lions-year.ics?year=YYYY-YY
 *
 * Subscribable iCalendar feed of every Lions Year event for the
 * current chair's zone. Paste this URL into Google Calendar /
 * Apple Calendar / Outlook → Add by URL.
 */
export async function GET(req: Request) {
  const ctx = await requireZoneChair();
  const url = new URL(req.url);
  const year = url.searchParams.get('year') ?? lionsYearFor(new Date());

  const db = createAdminClient();
  const { data: rows } = await db.from('lions_calendar')
    .select('*')
    .is('deleted_at', null)
    .eq('lions_year', year)
    .or(`zone_id.eq.${ctx.zone.id},zone_id.is.null`)
    .order('starts_at', { ascending: true });

  const events = (rows ?? []).map((r) => {
    const cat = CATEGORY_META[r.category as keyof typeof CATEGORY_META];
    const scope = SCOPE_META[r.scope as keyof typeof SCOPE_META];
    const labelParts = [cat?.label, scope?.label, r.announced_by].filter(Boolean);
    const description = [r.description, labelParts.length ? `[${labelParts.join(' · ')}]` : null]
      .filter(Boolean).join('\n\n');
    return {
      uid: `lions-cal-${r.id}@lcbarodarisingstar`,
      start: r.starts_at as string,
      end: r.ends_at as string | undefined,
      allDay: !!r.all_day,
      summary: `${cat?.emoji ?? ''} ${r.title}`.trim(),
      description,
      location: r.location ?? undefined,
      url: r.source_url ?? undefined,
      categories: [cat?.label, scope?.label].filter(Boolean) as string[],
      status: 'CONFIRMED' as const,
    };
  });

  const ics = buildIcs({
    name: `Lions Year ${year} · ${ctx.zone.name}`,
    description: `Official Lions tenure calendar for ${ctx.zone.name}, District ${ctx.district?.code ?? ''}.`,
    color: '#0B1F4D',
    events,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="lions-year-${year}.ics"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
