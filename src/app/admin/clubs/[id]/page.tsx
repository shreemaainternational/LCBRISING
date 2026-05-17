import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Activity, Banknote, ShieldCheck, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { formatINRShort } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: club } = await db.from('clubs')
    .select('id, name, club_number, charter_date, city, state, country, district_id, zone_id, region_id, latitude, longitude, health_score, compliance_score, health_commentary, category, districts(code, name), zones(code, name), regions(code, name)')
    .eq('id', id).is('deleted_at', null).maybeSingle();
  if (!club) notFound();

  const [{ count: memberCount }, { data: officers }, { data: activities }, { data: dues }] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true }).eq('club_id', id).is('deleted_at', null),
    db.from('club_officers').select('id, role, term_start, term_end, status, members(name, email)').eq('club_id', id).limit(20),
    db.from('activities').select('id, title, date, beneficiaries, amount_raised').eq('club_id', id).order('date', { ascending: false }).limit(8),
    db.from('dues_invoices').select('amount, amount_paid, status').eq('club_id', id).neq('status', 'paid'),
  ]);

  const duesPending = ((dues ?? []) as { amount: number; amount_paid: number | null }[])
    .reduce((a, b) => a + Math.max(0, Number(b.amount ?? 0) - Number(b.amount_paid ?? 0)), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/clubs" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Clubs
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">{club.name}</h1>
          <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-2">
            {club.club_number && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#{club.club_number}</span>}
            {(club.districts as { code?: string } | null)?.code && <span>District {(club.districts as { code?: string } | null)?.code}</span>}
            {(club.zones as { name?: string } | null)?.name && <span>· Zone {(club.zones as { name?: string } | null)?.name}</span>}
            {club.charter_date && <span className="inline-flex items-center gap-1"><Calendar size={11} /> Chartered {new Date(club.charter_date).toLocaleDateString('en-IN')}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/clubs/${id}/officers`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
            <ShieldCheck size={14} /> Officers
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Members" value={String(memberCount ?? 0)} icon={Users} />
        <KpiTile label="Activities (recent)" value={String(activities?.length ?? 0)} icon={Activity} />
        <KpiTile label="Dues pending" value={`₹${formatINRShort(duesPending)}`} icon={Banknote} tone={duesPending > 0 ? 'rose' : undefined} />
        <KpiTile label="Health score" value={club.health_score == null ? '—' : String(club.health_score)} icon={ShieldCheck}
          tone={club.health_score == null ? undefined : club.health_score >= 70 ? 'emerald' : club.health_score >= 50 ? 'amber' : 'rose'} />
      </div>

      {club.health_commentary && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Health commentary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{club.health_commentary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-amber-500" /> Officers</span>
              <Link href={`/admin/clubs/${id}/officers`} className="text-xs text-amber-600 hover:underline">Manage →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!officers?.length ? (
              <div className="p-6 text-center text-sm text-gray-500">No officers assigned yet.</div>
            ) : (
              <ul className="divide-y">
                {officers.map((o) => (
                  <li key={o.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-navy-800">{(o.members as { name?: string } | null)?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500 capitalize">{o.role?.replace(/_/g, ' ')}</div>
                    </div>
                    {o.status && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        o.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>{o.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><Activity size={14} className="text-emerald-500" /> Recent activities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!activities?.length ? (
              <div className="p-6 text-center text-sm text-gray-500">No activities filed yet.</div>
            ) : (
              <ul className="divide-y">
                {activities.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <Link href={`/admin/activities/${a.id}`} className="block hover:bg-gray-50 -mx-4 -my-2.5 px-4 py-2.5">
                      <div className="text-sm font-semibold text-navy-800">{a.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(a.date).toLocaleDateString('en-IN')}
                        {a.beneficiaries > 0 && <> · {a.beneficiaries} beneficiaries</>}
                        {Number(a.amount_raised) > 0 && <> · ₹{formatINRShort(Number(a.amount_raised))} raised</>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {(club.city || club.latitude) && (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">
              {[club.city, club.state, club.country].filter(Boolean).join(', ') || '—'}
            </div>
            {club.latitude && club.longitude && (
              <a href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:underline">
                Open in Google Maps <ExternalLink size={11} />
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiTile({ label, value, icon: Icon, tone }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: 'emerald' | 'amber' | 'rose';
}) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : tone === 'rose' ? 'text-rose-700' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
