import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { Plus, MapPin, Phone, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileBeneficiaries() {
  const { data } = await createAdminClient()
    .from('beneficiaries').select('*').is('deleted_at', null)
    .order('last_service_date', { ascending: false, nullsFirst: false }).limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">Beneficiaries</h1>
        <Link href="/m/beneficiaries/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-800 text-white text-sm font-semibold">
          <Plus size={16} /> Add
        </Link>
      </div>

      <div className="space-y-2">
        {(data ?? []).map((b) => (
          <Link key={b.id} href={`/admin/beneficiaries/${b.id}`}
            className="block bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold">
                {b.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{b.full_name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex gap-2 flex-wrap">
                  {b.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{b.phone}</span>}
                  {b.city && <span className="inline-flex items-center gap-1"><MapPin size={10} />{b.city}</span>}
                </div>
              </div>
              <div className="text-right pr-1">
                <div className="text-[11px] font-bold text-navy-800">{b.total_services_received ?? 0}</div>
                <div className="text-[9px] text-gray-500 uppercase">services</div>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </div>
          </Link>
        ))}
        {!data?.length && (
          <div className="text-center text-sm text-gray-500 py-10 bg-white rounded-xl">
            No beneficiaries yet
          </div>
        )}
      </div>
    </div>
  );
}
