import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { AdvisoryComposer } from './AdvisoryComposer';
import { createAdminClient } from '@/lib/supabase/server';
import { Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ club?: string }>; }

export default async function ZoneAdvisoriesPage({ searchParams }: Props) {
  const ctx = await requireZoneChair();
  const { club: prefillClub } = await searchParams;
  const db = createAdminClient();

  const [{ data: clubs }, { data: advisories }] = await Promise.all([
    db.from('clubs').select('id, name').eq('zone_id', ctx.zone.id).is('deleted_at', null).order('name'),
    db.from('advisories')
      .select('*, clubs(name)')
      .eq('zone_id', ctx.zone.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Advisories</h2>
        <p className="text-gray-600 text-sm mt-1">
          Send and track advisories to clubs in {ctx.zone.name}.
        </p>
      </div>
      <ZoneTabs />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Bell size={14} className="text-amber-500" />
            <h3 className="font-semibold text-navy-800">Sent advisories</h3>
          </div>
          {!advisories?.length ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No advisories yet. Compose one on the right.
            </div>
          ) : (
            <ul className="divide-y">
              {advisories.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      {a.status === 'resolved'
                        ? <CheckCircle2 size={14} className="text-emerald-600" />
                        : <AlertTriangle size={14} className={
                            a.priority === 'critical' ? 'text-rose-600' :
                            a.priority === 'warning'  ? 'text-amber-600' :
                            'text-blue-600'
                          } />}
                      <div className="font-semibold text-sm text-navy-800">{a.subject}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      a.status === 'resolved'    ? 'bg-emerald-100 text-emerald-700' :
                      a.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'dismissed'   ? 'bg-gray-100 text-gray-600' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-snug">{a.body}</p>
                  {a.action_required && (
                    <p className="text-xs text-gray-700 mt-1"><strong>Action:</strong> {a.action_required}</p>
                  )}
                  <div className="text-[11px] text-gray-500 mt-1.5">
                    To <strong>{(a.clubs as { name?: string } | null)?.name ?? 'Zone'}</strong>
                    {' · '}
                    {new Date(a.created_at).toLocaleString('en-IN')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          <AdvisoryComposer
            zoneId={ctx.zone.id}
            districtId={ctx.zone.district_id}
            clubs={clubs ?? []}
            initialClubId={prefillClub ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
