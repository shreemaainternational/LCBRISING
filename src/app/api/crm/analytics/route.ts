import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * Federation-wide analytics snapshot. Scoped to a district when
 * `?district_id=` is supplied. Returns counters used by the dashboard
 * (Phase 10 reports). All counts respect RLS — `report.read` permission
 * required.
 */
export async function GET(req: NextRequest) {
  const actor = await requirePermission('report.read');
  if (isGuardFailure(actor)) return actor;

  const districtId = req.nextUrl.searchParams.get('district_id');
  const supa = await createClient();

  const memberBase = supa
    .from('members')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);
  const clubBase = supa
    .from('clubs')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  const [activeMembers, lapsedMembers, pendingMembers, totalClubs, recentAttendance, recentSyncFailures] =
    await Promise.all([
      districtId
        ? memberBase.eq('status', 'active').eq('district_id', districtId)
        : memberBase.eq('status', 'active'),
      districtId
        ? supa.from('members').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'lapsed').eq('district_id', districtId)
        : supa.from('members').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'lapsed'),
      districtId
        ? supa.from('members').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending').eq('district_id', districtId)
        : supa.from('members').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      districtId
        ? clubBase.eq('district_id', districtId)
        : clubBase,
      supa
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .gte('occurred_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      supa
        .from('sync_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
    ]);

  return NextResponse.json({
    scope: districtId ? { district_id: districtId } : { scope: 'all' },
    members: {
      active: activeMembers.count ?? 0,
      lapsed: lapsedMembers.count ?? 0,
      pending: pendingMembers.count ?? 0,
    },
    clubs_total: totalClubs.count ?? 0,
    attendance_last_30d: recentAttendance.count ?? 0,
    sync_failures_last_7d: recentSyncFailures.count ?? 0,
    generated_at: new Date().toISOString(),
  });
}
