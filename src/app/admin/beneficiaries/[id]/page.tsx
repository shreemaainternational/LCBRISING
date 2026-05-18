import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import {
  ArrowLeft, MapPin, Phone, Mail, User, Cake, IdCard,
  HeartPulse, FileText, Calendar,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { BeneficiaryForm } from '../BeneficiaryForm';
import { ServiceLogForm } from './ServiceLogForm';

export const dynamic = 'force-dynamic';

export default async function BeneficiaryProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: bene }, { data: services }] = await Promise.all([
    db.from('beneficiaries').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    db.from('beneficiary_services').select('*, activities(id,title,date,category)').eq('beneficiary_id', id).order('service_date', { ascending: false }).limit(100),
  ]);
  if (!bene) notFound();

  const pending = (services ?? []).filter((s) => s.follow_up_required && !s.follow_up_status);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/beneficiaries" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Beneficiaries
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
            {bene.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-800">{bene.full_name}</h1>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
              {bene.gender && <Pill icon={<User size={11} />} value={String(bene.gender)} />}
              {bene.age && <Pill icon={<Cake size={11} />} value={`${bene.age} years`} />}
              {bene.phone && <Pill icon={<Phone size={11} />} value={bene.phone} />}
              {bene.email && <Pill icon={<Mail size={11} />} value={bene.email} />}
              {bene.city && <Pill icon={<MapPin size={11} />} value={`${bene.city}${bene.state ? `, ${bene.state}` : ''}`} />}
              {bene.aadhaar_last4 && <Pill icon={<IdCard size={11} />} value={`XXXX-${bene.aadhaar_last4}`} />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Services Received" value={String(bene.total_services_received ?? 0)} color="#0F766E" />
        <Kpi label="Value Delivered" value={formatINR(Number(bene.total_value_received ?? 0))} color="#F59E0B" />
        <Kpi label="Last Service" value={bene.last_service_date ? new Date(bene.last_service_date).toLocaleDateString('en-IN') : '—'} color="#2563EB" />
        <Kpi label="Follow-ups Pending" value={String(pending.length)} color={pending.length ? '#DC2626' : '#16A34A'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HeartPulse size={16} className="text-rose-500" /> Service History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Service / Activity</th>
                    <th className="text-right p-3">Value</th>
                    <th className="text-left p-3">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {!services?.length && (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500 text-sm">No service records yet. Log one below.</td></tr>
                  )}
                  {(services ?? []).map((s) => {
                    const act = s.activities as { title?: string; category?: string } | null;
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-3 text-xs text-gray-600">
                          <Calendar size={11} className="inline mr-1" />
                          {new Date(s.service_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{s.service_type ?? act?.title ?? '—'}</div>
                          {s.description && <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>}
                          {act?.title && <div className="text-xs text-gray-400 mt-0.5">via {act.title}</div>}
                        </td>
                        <td className="p-3 text-right">{s.value_provided ? formatINR(Number(s.value_provided)) : '—'}</td>
                        <td className="p-3 text-xs">
                          {s.follow_up_required ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full ${s.follow_up_status ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                              {s.follow_up_status || 'Pending'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText size={16} className="text-purple-500" /> Log New Service</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceLogForm beneficiaryId={bene.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
            <CardContent>
              <BeneficiaryForm mode="edit" initial={bene} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
      {icon} {value}
    </span>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="relative bg-white border rounded-lg p-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-bold text-navy-800">{value}</div>
    </div>
  );
}
