import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import {
  buildReportDoc, renderReport, parsePeriod, enrichWithAINarrative, type ReportRequest,
} from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  type: z.enum([
    'monthly','quarterly','half_yearly','yearly',
    'activity','csr','donor','district','multi_district',
    'lions_international','beneficiary','financial',
    'volunteer','sdg_impact','event_performance',
    'medical_camp','service_category','award_qualification',
    'club_growth','membership',
  ]),
  formats: z.array(z.enum(['pdf','pptx'])).default(['pdf']),
  scope: z.enum(['month','quarter','half','year','custom']).default('month'),
  year: z.number().int().default(new Date().getFullYear()),
  index: z.number().int().default(new Date().getMonth()),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.object({
    clubId: z.string().optional(),
    districtId: z.string().optional(),
    multipleDistrictId: z.string().optional(),
    category: z.string().optional(),
    campaign: z.string().optional(),
    csrPartnerId: z.string().optional(),
    donorId: z.string().optional(),
    eventId: z.string().optional(),
    memberId: z.string().optional(),
    activityId: z.string().optional(),
  }).default({}),
  persist: z.boolean().default(true),
  aiNarrative: z.boolean().default(false),
  language: z.enum(['en','gu','bilingual']).default('en'),
  tone: z.enum(['executive','board','donor','press_release','social_media','lions_district','volunteer_thanks','sponsor_pitch']).optional(),
});

/** POST /api/reports/generate — build + render + persist. */
export async function POST(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const period = body.scope === 'custom' && body.startDate && body.endDate
    ? { start: new Date(body.startDate), end: new Date(body.endDate), label: `${body.startDate} → ${body.endDate}`, lionsYear: `${body.year}-${String((body.year + 1) % 100).padStart(2, '0')}` }
    : parsePeriod(body.scope === 'custom' ? 'month' : body.scope, body.year, body.index);

  const reqIn: ReportRequest = {
    type: body.type,
    format: body.formats[0],
    period,
    filters: body.filters,
  };

  let doc = await buildReportDoc(reqIn);
  if (body.aiNarrative) {
    try { doc = await enrichWithAINarrative(doc, body.language, body.tone); }
    catch (e) { /* leave deterministic narrative if AI fails */ console.error('ai narrative failed:', e); }
  }
  const rendered = await Promise.all(body.formats.map((fmt) => renderReport(doc, fmt)));

  if (!body.persist) {
    return NextResponse.json({
      doc: { title: doc.title, kpis: doc.kpis, tables: doc.tables.length, charts: doc.charts.length },
      artifacts: rendered.map((r) => ({ format: r.format, filename: r.filename, size: r.buffer.length })),
    });
  }

  const db = createAdminClient();
  const ids: string[] = [];
  for (const r of rendered) {
    const path = `reports/${doc.type}/${period.lionsYear}/${r.filename}`;
    let downloadUrl: string | null = null;

    // Best-effort upload to Storage. Falls back to inline base64 in DB if unavailable.
    try {
      const { error: upErr } = await db.storage
        .from('reports')
        .upload(path, r.buffer, { contentType: r.mime, upsert: true });
      if (!upErr) {
        const { data } = db.storage.from('reports').getPublicUrl(path);
        downloadUrl = data.publicUrl;
      }
    } catch { /* storage bucket not yet provisioned — degrade gracefully */ }

    const { data, error } = await db.from('reports').insert({
      type: doc.type,
      title: doc.title,
      period_start: period.start.toISOString().slice(0, 10),
      period_end: period.end.toISOString().slice(0, 10),
      lions_year: period.lionsYear,
      format: r.format,
      status: 'ready',
      filters: body.filters,
      summary: { kpis: doc.kpis, tableCount: doc.tables.length, chartCount: doc.charts.length },
      totals: doc.totals,
      storage_path: downloadUrl ? path : null,
      download_url: downloadUrl,
      size_bytes: r.buffer.length,
      page_count: r.pageCount ?? null,
      generated_by: actor?.id ?? null,
    }).select('id').single();

    if (!error && data?.id) ids.push(data.id as string);
  }

  return NextResponse.json({
    ok: true,
    ids,
    count: ids.length,
    period: { start: period.start, end: period.end, label: period.label, lionsYear: period.lionsYear },
  });
}
