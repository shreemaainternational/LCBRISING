import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  buildReportDoc, renderReport, parsePeriod, type ReportRequest, type ReportType, type ReportFormat,
} from '@/lib/reports';
import { verifyCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/reports?secret=...&type=monthly
 *
 * Scheduled report generation. Vercel cron hits this with the current
 * month/quarter etc. and renders+persists default formats.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);

  const type = (url.searchParams.get('type') ?? 'monthly') as ReportType;
  const formats = (url.searchParams.get('formats')?.split(',') ?? ['pdf','pptx']) as ReportFormat[];
  const force = url.searchParams.get('force') === '1';

  const today = new Date();

  // Day-of-the-month / month-of-the-year gating. Vercel Hobby only
  // allows once-per-day cron, so we fire every day but no-op unless
  // it's the correct boundary day. Pass ?force=1 to bypass for ad-hoc runs.
  if (!force) {
    const d = today.getDate();
    const m = today.getMonth(); // 0-11
    const skip =
      (type === 'monthly'    && d !== 1) ||
      (type === 'quarterly'  && (d !== 1 || ![0, 3, 6, 9].includes(m))) ||
      (type === 'half_yearly' && (d !== 1 || ![0, 6].includes(m))) ||
      (type === 'yearly'     && (d !== 1 || m !== 6));   // July 1 → previous Lions year
    if (skip) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'not a ' + type + ' boundary day' });
    }
  }

  let period;
  if (type === 'monthly') {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    period = parsePeriod('month', prev.getFullYear(), prev.getMonth());
  } else if (type === 'quarterly') {
    const prev = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const q = Math.floor(prev.getMonth() / 3) + 1;
    period = parsePeriod('quarter', prev.getFullYear(), q);
  } else if (type === 'half_yearly') {
    const prev = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    period = parsePeriod('half', prev.getFullYear(), prev.getMonth() < 6 ? 1 : 2);
  } else if (type === 'yearly') {
    period = parsePeriod('year', today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1, 0);
  } else {
    period = parsePeriod('month', today.getFullYear(), today.getMonth());
  }

  const db = createAdminClient();
  const out: { id: string; format: string }[] = [];

  for (const fmt of formats) {
    const reqIn: ReportRequest = { type, format: fmt, period, filters: {} };
    const doc = await buildReportDoc(reqIn);
    const r = await renderReport(doc, fmt);
    const path = `reports/${type}/${period.lionsYear}/${r.filename}`;
    let downloadUrl: string | null = null;
    try {
      const { error } = await db.storage.from('reports').upload(path, r.buffer, { contentType: r.mime, upsert: true });
      if (!error) downloadUrl = db.storage.from('reports').getPublicUrl(path).data.publicUrl;
    } catch { /* storage not provisioned */ }

    const { data } = await db.from('reports').insert({
      type, title: doc.title,
      period_start: period.start.toISOString().slice(0,10),
      period_end: period.end.toISOString().slice(0,10),
      lions_year: period.lionsYear, format: fmt, status: 'ready',
      filters: {}, summary: { kpis: doc.kpis }, totals: doc.totals,
      storage_path: downloadUrl ? path : null, download_url: downloadUrl,
      size_bytes: r.buffer.length, page_count: r.pageCount ?? null,
    }).select('id').single();
    if (data?.id) out.push({ id: data.id as string, format: fmt });
  }

  return NextResponse.json({ ok: true, type, period: period.label, generated: out });
}
