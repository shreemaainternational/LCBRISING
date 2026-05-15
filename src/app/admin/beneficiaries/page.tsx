import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { Users, Plus, MapPin, Phone, Calendar } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { BeneficiarySearch } from './BeneficiarySearch';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ q?: string; city?: string; gender?: string }>; }

export default async function BeneficiariesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const db = createAdminClient();

  let query = db.from('beneficiaries').select('*', { count: 'exact' }).is('deleted_at', null);
  if (sp.q) query = query.or(`full_name.ilike.%${sp.q}%,phone.ilike.%${sp.q}%,email.ilike.%${sp.q}%`);
  if (sp.city) query = query.eq('city', sp.city);
  if (sp.gender) query = query.eq('gender', sp.gender);
  query = query.order('last_service_date', { ascending: false, nullsFirst: false }).limit(100);
  const { data: beneficiaries, count } = await query;

  const [{ count: total }, { count: female }, { count: male }, { data: agg }] = await Promise.all([
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('gender', 'female'),
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('gender', 'male'),
    db.from('beneficiaries').select('total_value_received').is('deleted_at', null),
  ]);
  const totalValue = (agg ?? []).reduce((a, b) => a + Number(b.total_value_received ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Users className="text-emerald-500" /> Beneficiary CRM
          </h1>
          <p className="text-gray-600">
            Track who you serve, what you've delivered, follow-up status and demographics.
          </p>
        </div>
        <Link
          href="/admin/beneficiaries/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 text-white text-sm font-medium hover:bg-navy-800"
        >
          <Plus size={16} /> Add Beneficiary
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Beneficiaries" value={(total ?? 0).toLocaleString('en-IN')} color="#0F766E" />
        <KpiTile label="Female" value={(female ?? 0).toLocaleString('en-IN')} color="#DB2777" />
        <KpiTile label="Male" value={(male ?? 0).toLocaleString('en-IN')} color="#2563EB" />
        <KpiTile label="Value Delivered" value={formatINR(totalValue)} color="#F59E0B" />
      </div>

      <BeneficiarySearch initialQ={sp.q ?? ''} initialCity={sp.city ?? ''} initialGender={sp.gender ?? ''} />

      <Card>
        <CardHeader>
          <CardTitle>
            {count != null ? `${count} match${count === 1 ? '' : 'es'}` : 'Beneficiaries'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Demo</th>
                <th className="text-right p-3">Services</th>
                <th className="text-right p-3">Value</th>
                <th className="text-left p-3">Last Service</th>
              </tr>
            </thead>
            <tbody>
              {!beneficiaries?.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No beneficiaries match. Try clearing filters or{' '}
                    <Link href="/admin/beneficiaries/new" className="text-amber-600 underline">add one</Link>.
                  </td>
                </tr>
              )}
              {(beneficiaries ?? []).map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    <Link href={`/admin/beneficiaries/${b.id}`} className="text-navy-800 hover:underline">
                      {b.full_name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                      {b.phone && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Phone size={11} /> {b.phone}
                        </span>
                      )}
                      {b.email && <span className="text-xs text-gray-500">{b.email}</span>}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">
                    {b.city ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin size={11} /> {b.city}{b.state ? `, ${b.state}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {b.gender && <span className="capitalize">{b.gender}</span>}
                    {b.age && <span> · {b.age}y</span>}
                  </td>
                  <td className="p-3 text-right font-medium">{b.total_services_received ?? 0}</td>
                  <td className="p-3 text-right text-gray-600">
                    {b.total_value_received ? formatINR(Number(b.total_value_received)) : '—'}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {b.last_service_date ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} /> {new Date(b.last_service_date).toLocaleDateString('en-IN')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="relative bg-white border rounded-lg p-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-navy-800">{value}</div>
    </div>
  );
}
