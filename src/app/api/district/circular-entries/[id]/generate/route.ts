import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { generateCircularAssets } from '@/lib/ai/circular-assets';
import type { CircularEntryFields } from '@/lib/ai/circular-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/district/circular-entries/:id/generate
 * Auto-generate the short message / WhatsApp / social / flyer / presentation
 * outline / minutes bundle for a saved entry and persist it on the row.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireDistrictGovernor();
  const { id } = await params;
  const db = createAdminClient();

  const { data: entry } = await db.from('district_circular_entries')
    .select('id, entry_type, title, description, category, priority, event_date, start_time, end_time, venue, chief_guest, region_id, zone_id, club_id')
    .eq('id', id).eq('district_id', ctx.district.id).maybeSingle();
  if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const scope = await describeScope(db, ctx.district.code, entry.region_id, entry.zone_id, entry.club_id);

  const fields: CircularEntryFields & { scope?: string } = {
    entry_type: entry.entry_type,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    priority: entry.priority,
    event_date: entry.event_date,
    start_time: entry.start_time,
    end_time: entry.end_time,
    venue: entry.venue,
    chief_guest: entry.chief_guest,
    scope,
  };

  const { assets, source, ai_error } = await generateCircularAssets(fields);

  const { data: updated, error } = await db.from('district_circular_entries').update({
    short_message: assets.short_message,
    whatsapp_text: assets.whatsapp_text,
    social_caption: assets.social_caption,
    social_hashtags: assets.social_hashtags,
    flyer: assets.flyer,
    presentation: assets.presentation,
    minutes: assets.minutes,
    assets_generated_at: new Date().toISOString(),
    status: 'ready',
  }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, source, ai_error, entry: updated });
}

async function describeScope(
  db: ReturnType<typeof createAdminClient>,
  districtCode: string,
  regionId: string | null,
  zoneId: string | null,
  clubId: string | null,
): Promise<string> {
  if (clubId) {
    const { data } = await db.from('clubs').select('name').eq('id', clubId).maybeSingle();
    if (data?.name) return `${data.name} (single club)`;
  }
  if (zoneId) {
    const { data } = await db.from('zones').select('name, code').eq('id', zoneId).maybeSingle();
    if (data) return `all clubs in Zone ${data.code ?? ''} ${data.name ?? ''}`.trim();
  }
  if (regionId) {
    const { data } = await db.from('regions').select('name, code').eq('id', regionId).maybeSingle();
    if (data) return `all clubs in Region ${data.code ?? ''} ${data.name ?? ''}`.trim();
  }
  return `every club in District ${districtCode}`;
}
