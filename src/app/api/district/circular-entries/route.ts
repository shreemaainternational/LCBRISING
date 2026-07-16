import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { ENTRY_TYPES } from '@/lib/ai/circular-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SELECT =
  'id, reference_no, entry_type, title, description, category, priority, event_date, ' +
  'start_time, end_time, venue, chief_guest, region_id, zone_id, club_id, ' +
  'target_zone_ids, target_club_ids, source_kind, source_url, source_filename, extracted, ' +
  'extraction_confidence, short_message, whatsapp_text, social_caption, social_hashtags, ' +
  'flyer, presentation, presentation_url, minutes, assets_generated_at, status, ' +
  'circular_id, created_at, updated_at';

const entrySchema = z.object({
  entry_type: z.enum(ENTRY_TYPES as [string, ...string[]]).default('circular'),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).nullish(),
  category: z.string().max(120).nullish(),
  priority: z.enum(['info', 'important', 'urgent']).default('info'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  start_time: z.string().max(40).nullish(),
  end_time: z.string().max(40).nullish(),
  venue: z.string().max(300).nullish(),
  chief_guest: z.string().max(300).nullish(),
  // Scope may arrive as a UUID (from a dropdown) or a name (from a sheet).
  region: z.string().max(200).nullish(),
  zone: z.string().max(200).nullish(),
  club: z.string().max(200).nullish(),
  region_id: z.string().uuid().nullish(),
  zone_id: z.string().uuid().nullish(),
  club_id: z.string().uuid().nullish(),
  source_kind: z.enum(['manual', 'bulk', 'flyer', 'pdf', 'presentation', 'image']).default('manual'),
  source_url: z.string().url().nullish(),
  source_filename: z.string().max(300).nullish(),
  extracted: z.boolean().optional(),
  extraction_confidence: z.enum(['high', 'medium', 'low']).nullish(),
});

const createSchema = z.object({ entries: z.array(entrySchema).min(1).max(500) });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const ctx = await requireDistrictGovernor();
  const url = new URL(req.url);
  const db = createAdminClient();
  let q = db.from('district_circular_entries').select(SELECT)
    .eq('district_id', ctx.district.id);

  const region = url.searchParams.get('region_id');
  const zone = url.searchParams.get('zone_id');
  const club = url.searchParams.get('club_id');
  const type = url.searchParams.get('entry_type');
  const status = url.searchParams.get('status');
  if (region && UUID_RE.test(region)) q = q.eq('region_id', region);
  if (zone && UUID_RE.test(zone)) q = q.eq('zone_id', zone);
  if (club && UUID_RE.test(club)) q = q.eq('club_id', club);
  if (type && ENTRY_TYPES.includes(type as (typeof ENTRY_TYPES)[number])) q = q.eq('entry_type', type);
  if (status) q = q.eq('status', status);

  const { data } = await q.order('created_at', { ascending: false }).limit(300);
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireDistrictGovernor();
  const raw = await req.json().catch(() => null);
  // Accept a bare single entry as a convenience.
  const body = raw && !Array.isArray(raw.entries) && raw.title ? { entries: [raw] } : raw;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const db = createAdminClient();

  // Load the district's scope tables so we can resolve names → ids and
  // backfill region from zone/club for consistent filtering.
  const [{ data: regions }, { data: zones }, { data: clubs }] = await Promise.all([
    db.from('regions').select('id, name, code').eq('district_id', ctx.district.id).is('deleted_at', null),
    db.from('zones').select('id, name, code, region_id').eq('district_id', ctx.district.id).is('deleted_at', null),
    db.from('clubs').select('id, name, zone_id, region_id').eq('district_id', ctx.district.id).is('deleted_at', null),
  ]);

  const regionByKey = keyMap(regions ?? [], ['name', 'code']);
  const zoneByKey = keyMap(zones ?? [], ['name', 'code']);
  const clubByKey = keyMap(clubs ?? [], ['name']);
  const zoneById = new Map((zones ?? []).map((z) => [z.id, z]));
  const clubById = new Map((clubs ?? []).map((c) => [c.id, c]));

  const rows = parsed.data.entries.map((e) => {
    const clubId = e.club_id ?? (e.club ? resolve(clubByKey, e.club) : null);
    let zoneId = e.zone_id ?? (e.zone ? resolve(zoneByKey, e.zone) : null);
    let regionId = e.region_id ?? (e.region ? resolve(regionByKey, e.region) : null);

    // Backfill the wider scope from the narrower one so region/zone filters
    // are always populated when a club or zone is chosen.
    const club = clubId ? clubById.get(clubId) : null;
    if (club) {
      zoneId = zoneId ?? club.zone_id ?? null;
      regionId = regionId ?? club.region_id ?? null;
    }
    const zone = zoneId ? zoneById.get(zoneId) : null;
    if (zone) regionId = regionId ?? zone.region_id ?? null;

    return {
      district_id: ctx.district.id,
      entry_type: e.entry_type,
      title: e.title,
      description: e.description ?? null,
      category: e.category ?? null,
      priority: e.priority,
      event_date: e.event_date ?? null,
      start_time: e.start_time ?? null,
      end_time: e.end_time ?? null,
      venue: e.venue ?? null,
      chief_guest: e.chief_guest ?? null,
      region_id: regionId,
      zone_id: zoneId,
      club_id: clubId,
      source_kind: e.source_kind,
      source_url: e.source_url ?? null,
      source_filename: e.source_filename ?? null,
      extracted: e.extracted ?? false,
      extraction_confidence: e.extraction_confidence ?? null,
      status: 'draft' as const,
      created_by: ctx.member.id,
    };
  });

  const { data, error } = await db.from('district_circular_entries').insert(rows).select(SELECT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, inserted: data?.length ?? 0, entries: data ?? [] });
}

// Build a lookup keyed by lower-cased values of the given fields.
function keyMap(items: Record<string, unknown>[], fields: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const it of items) {
    for (const f of fields) {
      const v = it[f];
      if (typeof v === 'string' && v.trim()) m.set(v.trim().toLowerCase(), String(it.id));
    }
  }
  return m;
}

function resolve(map: Map<string, string>, value: string): string | null {
  if (UUID_RE.test(value)) return value;
  return map.get(value.trim().toLowerCase()) ?? null;
}
