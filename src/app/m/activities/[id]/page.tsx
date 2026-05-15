import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Banknote } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MobileActivityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: a } = await createAdminClient().from('activities').select('*').eq('id', id).maybeSingle();
  if (!a) notFound();

  return (
    <div className="space-y-4">
      <Link href="/m/activities" className="inline-flex items-center gap-1 text-sm text-gray-600">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {a.category && (
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2">
            {a.category}
          </span>
        )}
        <h1 className="text-xl font-bold text-navy-800">{a.title}</h1>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
          <span className="inline-flex items-center gap-1"><Calendar size={11} /> {new Date(a.date).toLocaleDateString('en-IN')}</span>
          {a.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {a.location}</span>}
        </div>
        {a.description && <p className="text-sm text-gray-700 mt-3">{a.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users}    label="Beneficiaries" value={String(a.beneficiaries ?? 0)} color="bg-emerald-100 text-emerald-700" />
        <Stat icon={Clock}    label="Service Hours" value={String(a.service_hours ?? 0)} color="bg-purple-100 text-purple-700" />
        <Stat icon={Users}    label="Lions"        value={String(a.lion_members_count ?? 0)} color="bg-blue-100 text-blue-700" />
        <Stat icon={Banknote} label="Funds Raised" value={formatINR(Number(a.amount_raised ?? 0))} color="bg-amber-100 text-amber-700" />
      </div>

      {(a.before_photos?.length || a.after_photos?.length || a.photos?.length) ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {[...(a.before_photos ?? []), ...(a.after_photos ?? []), ...(a.photos ?? [])].slice(0, 9).map((url: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="aspect-square w-full object-cover rounded-lg" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number }>; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-lg font-bold text-navy-800">{value}</div>
    </div>
  );
}
