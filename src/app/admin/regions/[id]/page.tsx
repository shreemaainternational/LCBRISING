import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Building2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Region = { id: string; code: string; name: string; chairperson_name: string | null; district_id: string };

export default async function RegionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Admin-gated page: service-role read so member counts across the region's
  // clubs bypass the self-referential members RLS policy.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [regionRes, zonesRes, clubsRes] = await Promise.all([
    supa.from('regions').select('id, code, name, chairperson_name, district_id').eq('id', id).maybeSingle(),
    supa.from('zones').select('id, code, name, chairperson_name').eq('region_id', id).is('deleted_at', null).order('code'),
    supa.from('clubs').select('id, name, club_number, city, zone_id').eq('region_id', id).is('deleted_at', null).order('name'),
  ]);

  if (!regionRes.data) notFound();
  const region = regionRes.data as Region;
  const zones = (zonesRes.data ?? []) as { id: string; code: string; name: string; chairperson_name: string | null }[];
  const clubs = (clubsRes.data ?? []) as { id: string; name: string; club_number: string | null; city: string | null; zone_id: string | null }[];

  const clubIds = clubs.map((c) => c.id);
  const { count: memberCount } = clubIds.length
    ? await supa.from('members').select('id', { count: 'exact', head: true }).in('club_id', clubIds).is('deleted_at', null)
    : { count: 0 };

  const [{ data: district }] = await Promise.all([
    supa.from('districts').select('code, name').eq('id', region.district_id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/regions" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Regions
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800">{region.name}</h1>
        <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">Region {region.code}</span>
          {(district as { code?: string } | null)?.code && (
            <Link href={`/admin/districts/${region.district_id}`} className="hover:underline">District {(district as { code?: string } | null)?.code}</Link>
          )}
          {region.chairperson_name && <span>· Chair: {region.chairperson_name}</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiTile label="Zones" value={String(zones.length)} icon={MapPin} />
        <KpiTile label="Clubs" value={String(clubs.length)} icon={Building2} />
        <KpiTile label="Members" value={String(memberCount ?? 0)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="inline-flex items-center gap-2"><MapPin size={14} className="text-cyan-500" /> Zones</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!zones.length ? (
              <div className="p-6 text-center text-sm text-gray-500">No zones in this region yet.</div>
            ) : (
              <ul className="divide-y">
                {zones.map((z) => (
                  <li key={z.id} className="px-4 py-2.5 flex items-center justify-between">
                    <Link href={`/admin/zones/${z.id}`} className="text-sm font-semibold text-navy-800 hover:underline">{z.name}</Link>
                    <span className="text-xs text-gray-500 font-mono">{z.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="inline-flex items-center gap-2"><Building2 size={14} className="text-blue-500" /> Clubs</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!clubs.length ? (
              <div className="p-6 text-center text-sm text-gray-500">No clubs in this region yet.</div>
            ) : (
              <ul className="divide-y">
                {clubs.map((c) => (
                  <li key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                    <Link href={`/admin/clubs/${c.id}`} className="text-sm font-semibold text-navy-800 hover:underline">{c.name}</Link>
                    <span className="text-xs text-gray-500">{c.city ?? ''}{c.club_number ? ` · #${c.club_number}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <div className="text-2xl font-extrabold text-navy-900">{value}</div>
    </div>
  );
}
