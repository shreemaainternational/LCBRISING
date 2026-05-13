import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Zone = {
  id: string;
  code: string;
  name: string;
  chairperson_name: string | null;
  region_id: string | null;
  district_id: string;
};

type ClubRow = {
  id: string;
  name: string;
  club_number: string | null;
  city: string | null;
  charter_date: string | null;
};

export default async function ZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supa = await createClient();

  const [zoneRes, clubsRes] = await Promise.all([
    supa.from('zones').select('*').eq('id', id).maybeSingle(),
    supa
      .from('clubs')
      .select('id, name, club_number, city, charter_date')
      .eq('zone_id', id)
      .is('deleted_at', null)
      .order('name'),
  ]);

  if (!zoneRes.data) notFound();
  const zone = zoneRes.data as Zone;
  const clubs = (clubsRes.data ?? []) as ClubRow[];

  const clubIds = clubs.map((c) => c.id);
  const [memberCount, recentAttendance, recentEvents] = await Promise.all([
    clubIds.length === 0
      ? Promise.resolve({ count: 0 })
      : supa
          .from('members')
          .select('id', { count: 'exact', head: true })
          .in('club_id', clubIds)
          .is('deleted_at', null),
    clubIds.length === 0
      ? Promise.resolve({ count: 0 })
      : supa
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .in('club_id', clubIds)
          .gte(
            'occurred_at',
            new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          ),
    clubIds.length === 0
      ? Promise.resolve({ data: [] })
      : supa
          .from('events')
          .select('id, title, date, location')
          .order('date', { ascending: false })
          .limit(5),
  ]);

  const districtRes = await supa
    .from('districts')
    .select('id, code')
    .eq('id', zone.district_id)
    .maybeSingle();

  return (
    <div>
      <Link
        href="/admin/zones"
        className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:text-brand-600 mb-4"
      >
        <ArrowLeft size={14} /> All zones
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Badge variant="default" className="mb-2">
            {zone.code}
          </Badge>
          <h1 className="text-3xl font-bold text-navy-800">{zone.name}</h1>
          {districtRes.data && (
            <p className="text-sm text-gray-500 mt-1">
              Part of district{' '}
              <Link
                href={`/admin/districts/${districtRes.data.id}`}
                className="text-navy-700 hover:text-brand-600"
              >
                {districtRes.data.code}
              </Link>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat
            label="Clubs"
            value={clubs.length}
            icon={<Building2 size={14} />}
          />
          <Stat
            label="Members"
            value={memberCount.count ?? 0}
            icon={<Users size={14} />}
          />
          <Stat
            label="Check-ins · 30d"
            value={recentAttendance.count ?? 0}
            icon={<MapPin size={14} />}
          />
        </div>
      </div>

      {/* Chairperson card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Zone Chairperson</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium text-navy-800">
            {zone.chairperson_name ?? <span className="text-gray-400">Not assigned</span>}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Zone Chairpersons hold <code>zone_chairperson</code> in the RBAC
            permission matrix — they can read across all clubs in this zone and
            assign training.
          </p>
        </CardContent>
      </Card>

      {/* Clubs */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Clubs in this zone ({clubs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clubs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No clubs assigned to this zone yet.
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
                    <td className="p-3 text-gray-600">{c.city ?? '—'}</td>
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

      {/* Recent events (zone-wide) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(recentEvents.data ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No events recorded in this zone yet.
            </div>
          ) : (
            <ul className="divide-y">
              {(recentEvents.data ?? []).map(
                (e: { id: string; title: string; date: string; location: string | null }) => (
                  <li key={e.id} className="p-3 flex justify-between text-sm">
                    <span className="font-medium text-navy-800">{e.title}</span>
                    <span className="text-gray-500">
                      {new Date(e.date).toLocaleDateString()}
                      {e.location && ` · ${e.location}`}
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
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
