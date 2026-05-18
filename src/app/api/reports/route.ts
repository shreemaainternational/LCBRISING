import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { REPORT_CATALOG } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/reports — list generated reports + catalog. */
export async function GET(req: Request) {
  const actor = await requirePermission('report.read');
  if (isGuardFailure(actor)) return actor;
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);
  const type = url.searchParams.get('type');

  const db = createAdminClient();
  let q = db.from('reports')
    .select('id,type,title,period_start,period_end,lions_year,format,status,size_bytes,page_count,created_at,totals')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [], catalog: REPORT_CATALOG });
}
