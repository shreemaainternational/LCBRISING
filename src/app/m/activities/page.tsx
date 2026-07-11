import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { Plus, Activity, Calendar, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileActivities() {
  const { data } = await createAdminClient()
    .from('activities').select('*').order('date', { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">Activities</h1>
        <Link href="/m/activities/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-800 text-white text-sm font-semibold">
          <Plus size={16} /> Log
        </Link>
      </div>

      <div className="space-y-2">
        {(data ?? []).map((a) => (
          <Link key={a.id} href={`/m/activities/${a.id}`}
            className="block bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{a.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={10} />{new Date(a.date).toLocaleDateString('en-IN')}
                  </span>
                  {a.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} />{a.location}
                    </span>
                  )}
                  {a.category && <span className="capitalize">{a.category}</span>}
                </div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <Mini label="Benef." value={String(a.beneficiaries ?? 0)} />
              <Mini label="Hours" value={String(a.service_hours ?? 0)} />
              <Mini label="Lions" value={String(a.lion_members_count ?? 0)} />
            </div>
          </Link>
        ))}
        {!data?.length && (
          <div className="text-center text-sm text-gray-500 py-10 bg-white rounded-xl">
            No activities yet. <Link href="/m/activities/new" className="text-blue-800 underline">Log the first one</Link>.
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5">
      <div className="text-[14px] font-bold text-navy-800">{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
