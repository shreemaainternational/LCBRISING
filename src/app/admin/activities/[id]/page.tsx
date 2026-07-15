import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, Banknote,
  HeartPulse, Sparkles, Image as ImageIcon, Pencil,
} from 'lucide-react';
import { ActivityGallery } from './ActivityGallery';

export const dynamic = 'force-dynamic';

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: a, error } = await db.from('activities')
    .select('*, clubs(name), service_categories(name, color), csr_partners(name)')
    .eq('id', id).maybeSingle();
  if (error || !a) notFound();

  const photos: string[] = a.photos ?? [];
  const before: string[] = a.before_photos ?? [];
  const after: string[]  = a.after_photos ?? [];
  const videos: string[] = a.videos ?? [];
  const captions: Record<string, string> = a.photo_captions ?? {};

  const sdgs: string[] = a.sdg_codes ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/activities" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
          <ArrowLeft size={14} /> Back to Activities
        </Link>
        <Link
          href={`/admin/activities/${a.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900"
        >
          <Pencil size={14} /> Edit activity
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {a.category && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-2">
                {String(a.category).replace(/_/g, ' ')}
              </span>
            )}
            <h1 className="text-3xl font-bold text-navy-800">{a.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
              <span className="inline-flex items-center gap-1"><Calendar size={13} /> {formatDate(a.date)}</span>
              {a.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {a.location}</span>}
              {a.clubs && <span className="inline-flex items-center gap-1">🏢 {(a.clubs as { name?: string }).name}</span>}
              {a.csr_partners && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  🤝 CSR: {(a.csr_partners as { name?: string }).name}
                </span>
              )}
              {a.is_medical_camp && <span className="inline-flex items-center gap-1 text-rose-700"><HeartPulse size={13} /> Medical camp</span>}
            </div>
            {a.description && <p className="text-sm text-gray-700 mt-4 max-w-3xl leading-relaxed">{a.description}</p>}
          </div>

          {!!sdgs.length && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">UN SDGs</div>
              <div className="flex flex-wrap gap-1 justify-end">
                {sdgs.map((s) => (
                  <span key={s} className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi icon={Users}    label="Beneficiaries" value={String(a.beneficiaries ?? 0)} color="#0F766E" />
        <Kpi icon={Users}    label="Lion Members"  value={String(a.lion_members_count ?? 0)} color="#2563EB" />
        <Kpi icon={Users}    label="Leo Members"   value={String(a.leo_members_count ?? 0)} color="#7C3AED" />
        <Kpi icon={Clock}    label="Service Hours" value={String(a.service_hours ?? 0)} color="#DB2777" />
        <Kpi icon={Banknote} label="Funds Raised"  value={formatINR(Number(a.amount_raised ?? 0))} color="#F59E0B" />
        <Kpi icon={Banknote} label="Expenses"      value={formatINR(Number(a.expenses ?? 0))} color="#DC2626" />
      </div>

      {(photos.length > 0 || before.length > 0 || after.length > 0 || videos.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon size={16} className="text-blue-500" />
              Media Gallery
              <span className="ml-1 text-xs font-normal text-gray-500">
                {photos.length + before.length + after.length + videos.length} item(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityGallery
              activityId={a.id}
              photos={photos}
              before={before}
              after={after}
              videos={videos}
              initialCaptions={captions}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            <Sparkles className="mx-auto mb-2 text-amber-400" size={28} />
            <div className="text-sm">No media uploaded yet.</div>
            <Link
              href={`/admin/activities/${a.id}/edit`}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900"
            >
              <Pencil size={14} /> Add photos
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Project Financials</CardTitle></CardHeader>
          <CardContent>
            <Row label="Budget"             value={formatINR(Number(a.budget ?? 0))} />
            <Row label="Expenses"           value={formatINR(Number(a.expenses ?? 0))} />
            <Row label="Funds Raised"       value={formatINR(Number(a.amount_raised ?? 0))} />
            <Row label="CSR Sponsorship"    value={formatINR(Number(a.sponsorship_amount ?? 0))} />
            <Row label="Net"                value={formatINR(
              Number(a.amount_raised ?? 0) + Number(a.sponsorship_amount ?? 0) - Number(a.expenses ?? 0),
            )} highlight />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Audit & Metadata</CardTitle></CardHeader>
          <CardContent>
            <Row label="Status"             value={String(a.status ?? 'completed')} />
            <Row label="Impact Score"       value={a.impact_score == null ? '—' : `${a.impact_score} / 100`} />
            <Row label="Reported to District" value={a.reported_to_district ? 'Yes' : 'No'} />
            <Row label="GPS"                value={a.gps_lat && a.gps_lng ? `${Number(a.gps_lat).toFixed(4)}, ${Number(a.gps_lng).toFixed(4)}` : '—'} />
            <Row label="Created"            value={new Date(a.created_at).toLocaleString('en-IN')} />
            <Row label="Last Updated"       value={new Date(a.updated_at).toLocaleString('en-IN')} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number }>; label: string; value: string; color: string;
}) {
  return (
    <div className="relative bg-white border rounded-lg p-3 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-navy-800 truncate">{value}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${highlight ? 'border-t font-bold text-navy-800' : 'text-sm'}`}>
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? '' : 'text-gray-900 font-medium'}>{value}</span>
    </div>
  );
}
