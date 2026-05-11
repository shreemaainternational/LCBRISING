import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { generateClubInsights } from '@/lib/ai/insights';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params;
  const actor = await requirePermission('report.read');
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const [club, memberTotal, active, lapsed, pending, attendance, recentEvents] = await Promise.all([
    supa.from('clubs').select('id, name').eq('id', clubId).maybeSingle(),
    supa.from('members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).is('deleted_at', null),
    supa.from('members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).is('deleted_at', null).eq('status', 'active'),
    supa.from('members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).is('deleted_at', null).eq('status', 'lapsed'),
    supa.from('members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).is('deleted_at', null).eq('status', 'pending'),
    supa.from('attendance').select('id', { count: 'exact', head: true }).eq('club_id', clubId).gte('occurred_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    supa.from('events').select('title, date').order('date', { ascending: false }).limit(5),
  ]);

  if (!club.data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const insights = await generateClubInsights({
      club_id: clubId,
      club_name: club.data.name,
      member_total: memberTotal.count ?? 0,
      active: active.count ?? 0,
      lapsed: lapsed.count ?? 0,
      pending: pending.count ?? 0,
      attendance_last_30d: attendance.count ?? 0,
      recent_events: (recentEvents.data ?? []) as { title: string; date: string }[],
    });
    if (!insights) {
      return NextResponse.json(
        { error: 'ai_not_configured', message: 'Set OPENAI_API_KEY to enable insights.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ai_failed';
    return NextResponse.json({ error: 'ai_failed', message }, { status: 502 });
  }
}
