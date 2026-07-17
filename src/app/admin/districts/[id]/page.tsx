import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Users, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type District = {
  id: string;
  code: string;
  name: string;
  governor_name: string | null;
  cabinet_secretary_name: string | null;
  cabinet_treasurer_name: string | null;
  lions_year: string | null;
  multiple_district_id: string | null;
  created_at: string;
};

type ClubRow = {
  id: string;
  name: string;
  club_number: string | null;
  city: string | null;
  zone_id: string | null;
  region_id: string | null;
  charter_date: string | null;
};

export default async function DistrictDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [districtRes, clubsRes, memberCount, officerCount] = await Promise.all([
    supa.from('districts').select('*').eq('id', id).maybeSingle(),
    supa
      .from('clubs')
      .select('id, name, club_number, city, zone_id, region_id, charter_date')
      .eq('district_id', id)
      .is('deleted_at', null)
      .order('name'),
    supa
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('district_id', id)
      .is('deleted_at', null),
    supa
      .from('officers')
      .select('id', { count: 'exact', head: true })
      .eq('scope_kind', 'district')
      .eq('scope_id', id)
      .eq('status', 'active'),
  ]);

  if (!districtRes.data) notFound();
  const district = districtRes.data as District;
  const clubs = (clubsRes.data ?? []) as ClubRow[];

  return (
    <div>
      <Link
        href="/admin/districts"
        className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:text-brand-600 mb-4"
      >
        <ArrowLeft size={14} /> All districts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Badge variant="default" className="mb-2">
            {district.code}
          </Badge>
          <h1 className="text-3xl font-bold text-navy-800">{district.name}</h1>
          {district.lions_year && (
            <p className="text-sm text-gray-500 mt-1">
              Lions year {district.lions_year}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Clubs" value={clubs.length} icon={<Building2 size={14} />} />
          <Stat label="Members" value={memberCount.count ?? 0} icon={<Users size={14} />} />
          <Stat label="Officers" value={officerCount.count ?? 0} icon={<Calendar size={14} />} />
        </div>
      </div>

      {/* Leadership */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Leadership</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Governor</dt>
              <dd className="font-medium text-navy-800">{district.governor_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Cabinet Secretary</dt>
              <dd className="font-medium text-navy-800">{district.cabinet_secretary_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Cabinet Treasurer</dt>
              <dd className="font-medium text-navy-800">{district.cabinet_treasurer_name ?? '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Clubs */}
      <Card>
        <CardHeader>
          <CardTitle>Clubs in this district ({clubs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clubs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No clubs assigned to this district yet. Use{' '}
              <Link href="/admin/sync" className="text-brand-700 underline">
                CSV import
              </Link>{' '}
              to bulk-add.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Club #</th>
                  <th className="text-left p-3">City</th>
                  <th className="text-left p-3">Chartered</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium text-navy-800">{c.name}</td>
                    <td className="p-3 font-mono text-xs">{c.club_number ?? '—'}</td>
                    <td className="p-3 flex items-center gap-1 text-gray-600">
                      {c.city && <MapPin size={12} className="text-gray-400" />}
                      {c.city ?? '—'}
                    </td>
                    <td className="p-3 text-gray-500">{c.charter_date ?? '—'}</td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/clubs/${c.id}/officers`}
                        className="text-xs text-navy-700 hover:text-brand-600"
                      >
                        Officers →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-2">
      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-navy-800 tabular-nums">{value}</div>
    </div>
  );
}
