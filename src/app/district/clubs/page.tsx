import Link from 'next/link';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { Building2, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const RISK_PILL = (s: number | null): { label: string; cls: string } => {
  if (s == null) return { label: '—', cls: 'bg-gray-100 text-gray-500' };
  if (s >= 85)   return { label: 'Thriving', cls: 'bg-emerald-100 text-emerald-700' };
  if (s >= 70)   return { label: 'Healthy',  cls: 'bg-lime-100 text-lime-700' };
  if (s >= 50)   return { label: 'Watch',    cls: 'bg-amber-100 text-amber-800' };
  if (s >= 30)   return { label: 'At risk',  cls: 'bg-orange-100 text-orange-700' };
  return         { label: 'Critical', cls: 'bg-rose-100 text-rose-700' };
};

export default async function DistrictClubsPage() {
  const ctx = await requireDistrictGovernor();
  const { data: clubs } = await createAdminClient()
    .from('clubs')
    .select('id, name, club_number, city, state, zone_id, category, health_score, health_assessed_at')
    .eq('district_id', ctx.district.id).is('deleted_at', null)
    .order('health_score', { ascending: true, nullsFirst: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Clubs in District {ctx.district.code}</h2>
        <p className="text-gray-600 text-sm mt-1">Sorted by health — lowest first.</p>
      </div>
      <DistrictTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Club</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Health</th>
              <th className="text-left p-3">Last assessed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!clubs?.length ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No clubs yet</td></tr>
            ) : clubs.map((c) => {
              const pill = RISK_PILL(c.health_score);
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/admin/clubs/${c.id}`} className="font-semibold text-navy-800 hover:underline inline-flex items-center gap-1.5">
                      <Building2 size={13} className="text-blue-500" /> {c.name}
                    </Link>
                    {c.club_number && <div className="text-xs text-gray-500">#{c.club_number}</div>}
                  </td>
                  <td className="p-3 text-gray-600">{c.city ?? '—'}{c.state ? `, ${c.state}` : ''}</td>
                  <td className="p-3 text-xs text-gray-700 capitalize">{c.category?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="p-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${pill.cls}`}>
                      {pill.label}
                    </span>
                    <div className="text-sm font-bold text-navy-800 mt-1">
                      {c.health_score == null ? '—' : `${c.health_score}/100`}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {c.health_assessed_at ? new Date(c.health_assessed_at).toLocaleDateString('en-IN') : (
                      <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={11} /> Never</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/clubs/${c.id}`} className="text-xs text-amber-700 hover:text-amber-900">View →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
