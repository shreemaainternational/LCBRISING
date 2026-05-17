import { requireMdChair } from '@/lib/multi-district-portal';
import { MdTabs } from '../MdTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdvisoryRow {
  id: string;
  subject: string;
  body: string;
  priority: string;
  status: string;
  created_at: string;
  clubs: { name?: string } | null;
  zones: { name?: string } | null;
  districts: { code?: string; name?: string } | null;
}

export default async function MdNotificationsPage() {
  const ctx = await requireMdChair();
  const db = createAdminClient();
  const { data: districts } = await db.from('districts')
    .select('id').eq('multiple_district_id', ctx.md.id).is('deleted_at', null);
  const districtIds = (districts ?? []).map((d) => d.id);

  let advisories: AdvisoryRow[] = [];
  if (districtIds.length) {
    const { data } = await db.from('advisories')
      .select('id, subject, body, priority, status, created_at, clubs(name), zones(name), districts(code, name)')
      .in('district_id', districtIds)
      .order('created_at', { ascending: false })
      .limit(80);
    advisories = (data ?? []) as unknown as AdvisoryRow[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Notifications</h2>
        <p className="text-gray-600 text-sm mt-1">Advisories from every district inside {ctx.md.code}.</p>
      </div>
      <MdTabs />
      <div className="bg-white rounded-xl border shadow-sm">
        {!advisories.length ? (
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
                    {a.districts?.code ? `District ${a.districts.code}` : 'MD'}
                    {' · '}{a.zones?.name ?? '—'}
                    {' · '}{a.clubs?.name ?? '—'}
                    {' · '}{new Date(a.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                  a.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                  a.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-800'
                }`}>{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
