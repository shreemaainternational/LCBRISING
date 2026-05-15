import { requireRegionChair } from '@/lib/region-portal';
import { RegionTabs } from '../RegionTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegionNotificationsPage() {
  const ctx = await requireRegionChair();
  const db = createAdminClient();
  const { data: zones } = await db.from('zones').select('id').eq('region_id', ctx.region.id);
  const zoneIds = (zones ?? []).map((z) => z.id);

  const { data: advisories } = zoneIds.length
    ? await db.from('advisories').select('id, subject, body, priority, status, created_at, clubs(name)')
        .in('zone_id', zoneIds).order('created_at', { ascending: false }).limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Notifications</h2>
        <p className="text-gray-600 text-sm mt-1">Aggregated advisories across {ctx.region.name}.</p>
      </div>
      <RegionTabs />
      <div className="bg-white rounded-xl border shadow-sm">
        {!advisories?.length ? (
          <div className="p-10 text-center text-sm text-gray-500">No notifications yet</div>
        ) : (
          <ul className="divide-y">
            {advisories.map((a) => (
              <li key={a.id} className="p-4 flex items-start gap-3">
                <Bell size={14} className={
                  a.priority === 'critical' ? 'text-rose-600 mt-1' :
                  a.priority === 'warning'  ? 'text-amber-600 mt-1' :
                  'text-blue-600 mt-1'
                } />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{a.subject}</div>
                  <div className="text-xs text-gray-600">{a.body}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {(a.clubs as { name?: string } | null)?.name ?? 'Zone'} ·
                    {' ' + new Date(a.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
