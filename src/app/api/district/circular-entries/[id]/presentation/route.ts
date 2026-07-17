import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { buildEntryPptx } from '@/lib/ai/circular-pptx';
import { generateCircularAssets, type PresentationSlide } from '@/lib/ai/circular-assets';
import type { CircularEntryFields } from '@/lib/ai/circular-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/district/circular-entries/:id/presentation
 * Build a .pptx deck from the entry's slide outline (generating one first if
 * none exists), upload it to the media bucket and store the link on the row.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireDistrictGovernor();
  const { id } = await params;
  const db = createAdminClient();

  const { data: entry } = await db.from('district_circular_entries')
    .select('id, entry_type, title, description, category, priority, event_date, start_time, end_time, venue, chief_guest, presentation')
    .eq('id', id).eq('district_id', ctx.district.id).maybeSingle();
  if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let slides: PresentationSlide[] = Array.isArray((entry.presentation as { slides?: PresentationSlide[] } | null)?.slides)
    ? (entry.presentation as { slides: PresentationSlide[] }).slides
    : [];

  // Lazily generate the outline if the entry hasn't produced one yet.
  if (!slides.length) {
    const fields: CircularEntryFields = {
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
    };
    const { assets } = await generateCircularAssets(fields);
    slides = assets.presentation.slides;
    await db.from('district_circular_entries').update({ presentation: assets.presentation }).eq('id', id);
  }

  const subtitle = [entry.event_date, entry.venue].filter(Boolean).join(' · ') || null;
  const buffer = await buildEntryPptx({ title: entry.title, subtitle, districtCode: ctx.district.code, slides });

  const path = `circulars/deck-${id}-${Date.now()}.pptx`;
  const { error: upErr } = await db.storage.from('media').upload(path, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const url = db.storage.from('media').getPublicUrl(path).data.publicUrl;
  await db.from('district_circular_entries').update({ presentation_url: url }).eq('id', id);

  return NextResponse.json({ ok: true, presentation_url: url });
}
