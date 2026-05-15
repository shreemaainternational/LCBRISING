import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import {
  buildReportDoc, renderReport, type ReportFormat, type ReportRequest, type ReportType,
} from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/reports/[id]/download
 * If a stored artifact exists in Storage, redirect to its public URL.
 * Otherwise regenerate from the persisted metadata and stream inline.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: row, error } = await db.from('reports').select('*').eq('id', id).single();
  if (error || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (row.download_url) return NextResponse.redirect(row.download_url);

  // Regenerate on-the-fly from stored period + filters.
  const start = new Date(row.period_start);
  const end = new Date(row.period_end);
  const req: ReportRequest = {
    type: row.type as ReportType,
    format: row.format as ReportFormat,
    period: { start, end, label: row.title, lionsYear: row.lions_year ?? '' },
    filters: row.filters ?? {},
  };
  const doc = await buildReportDoc(req);
  const rendered = await renderReport(doc, row.format as ReportFormat);

  return new Response(rendered.buffer as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': rendered.mime,
      'Content-Disposition': `attachment; filename="${rendered.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
