import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = createAdminClient();
  let q = supabase
    .from('payment_audit_logs')
    .select('created_at, action, actor_kind, actor_id, invoice_id, payment_id, ip, user_agent, detail, members(name)')
    .order('created_at', { ascending: false })
    .limit(10_000);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lines = [csv(['when', 'action', 'actor_kind', 'actor', 'invoice_id', 'payment_id', 'ip', 'detail'].join(','))];
  for (const r of data ?? []) {
    type Row = typeof r & { members: { name: string } | null };
    const rr = r as Row;
    lines.push([
      csv(rr.created_at),
      csv(rr.action),
      csv(rr.actor_kind),
      csv(rr.members?.name ?? rr.actor_id ?? ''),
      csv(rr.invoice_id ?? ''),
      csv(rr.payment_id ?? ''),
      csv(rr.ip ?? ''),
      csv(rr.detail),
    ].join(','));
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
