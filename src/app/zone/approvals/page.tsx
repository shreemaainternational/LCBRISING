import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { CheckSquare, AlertTriangle, Clock, ToggleRight } from 'lucide-react';
import { ApprovalToggle } from './ApprovalToggle';
import { ApprovalActions } from './ApprovalActions';

export const dynamic = 'force-dynamic';

interface Pending {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  beneficiaries: number;
  service_hours: number;
  amount_raised: number;
  date: string;
  location: string | null;
  photos: string[] | null;
  approval_status: string;
  approval_notes: string | null;
  submitted_for_approval_at: string | null;
  created_at: string;
  clubs: { id: string; name: string } | null;
  members: { name: string; email: string } | null;
}

export default async function ZoneApprovalsPage() {
  const ctx = await requireZoneChair();
  const db = createAdminClient();

  const { data: clubs } = await db.from('clubs')
    .select('id, name').eq('zone_id', ctx.zone.id).is('deleted_at', null);
  const clubIds = (clubs ?? []).map((c) => c.id);

  const { data: zoneRow } = await db.from('zones')
    .select('require_activity_approval').eq('id', ctx.zone.id).maybeSingle();
  const approvalEnabled = !!zoneRow?.require_activity_approval;

  let pending: Pending[] = [];
  let recent: Pending[] = [];
  if (clubIds.length) {
    const [{ data: p }, { data: r }] = await Promise.all([
      db.from('activities')
        .select('id, title, description, category, beneficiaries, service_hours, amount_raised, date, location, photos, approval_status, approval_notes, submitted_for_approval_at, created_at, clubs(id, name), members:created_by(name, email)')
        .in('club_id', clubIds)
        .eq('approval_status', 'pending')
        .order('submitted_for_approval_at', { ascending: true })
        .limit(50),
      db.from('activities')
        .select('id, title, description, category, beneficiaries, service_hours, amount_raised, date, location, photos, approval_status, approval_notes, submitted_for_approval_at, created_at, clubs(id, name), members:created_by(name, email)')
        .in('club_id', clubIds)
        .in('approval_status', ['approved', 'rejected', 'changes_requested'])
        .order('approved_at', { ascending: false, nullsFirst: false })
        .limit(15),
    ]);
    pending = (p ?? []) as unknown as Pending[];
    recent = (r ?? []) as unknown as Pending[];
  }

  const totalRaised = pending.reduce((a, b) => a + Number(b.amount_raised ?? 0), 0);
  const totalHours  = pending.reduce((a, b) => a + Number(b.service_hours ?? 0), 0);
  const totalBenef  = pending.reduce((a, b) => a + Number(b.beneficiaries ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
            <CheckSquare className="text-amber-500" size={28} />
            Activity Approvals
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-3xl">
            Review activities filed by clubs in Zone {ctx.zone.code}. Approve, reject,
            or request changes. Clubs see the decision in their dashboard.
          </p>
        </div>
        <ApprovalToggle zoneId={ctx.zone.id} initial={approvalEnabled} />
      </div>
      <ZoneTabs />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Pending" value={pending.length} color="text-amber-700" icon={<Clock size={16} className="text-amber-500" />} />
        <KpiTile label="Beneficiaries pending" value={totalBenef} />
        <KpiTile label="Hours pending" value={Math.round(totalHours)} />
        <KpiTile label="Funds pending (₹)" value={Math.round(totalRaised)} />
      </div>

      {!approvalEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 inline-flex items-start gap-2">
          <ToggleRight size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Approval gating is currently <strong>off</strong> for this zone — new club
            activities post directly without your review. Use the toggle above to turn
            it on if you want to gate them.
          </span>
        </div>
      )}

      <section>
        <h3 className="font-semibold text-navy-800 mb-2">Pending review ({pending.length})</h3>
        {!pending.length ? (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
            Nothing waiting. New club activities will appear here once submitted.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((a) => <ActivityCard key={a.id} a={a} actionable />)}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h3 className="font-semibold text-navy-800 mb-2">Recent decisions</h3>
          <div className="space-y-3">
            {recent.map((a) => <ActivityCard key={a.id} a={a} actionable={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ActivityCard({ a, actionable }: { a: Pending; actionable: boolean }) {
  return (
    <article className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-navy-800">{a.title}</h4>
            <StatusPill s={a.approval_status} />
            {a.category && <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{a.category}</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {a.clubs?.name ?? '—'}
            {' · '}{new Date(a.date).toLocaleDateString('en-IN')}
            {a.location && <> · {a.location}</>}
            {a.members && <> · filed by {a.members.name}</>}
          </div>
          {a.description && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{a.description}</p>}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
            <Stat label="Beneficiaries" value={a.beneficiaries} />
            <Stat label="Hours" value={Number(a.service_hours).toFixed(1)} />
            <Stat label="Raised (₹)" value={Number(a.amount_raised).toLocaleString('en-IN')} />
            <Stat label="Photos" value={a.photos?.length ?? 0} />
          </div>
          {a.approval_notes && (
            <div className="mt-2 text-xs bg-gray-50 border-l-2 border-gray-300 px-3 py-1.5 text-gray-700 italic">
              {a.approval_notes}
            </div>
          )}
        </div>
        {actionable && <ApprovalActions activityId={a.id} />}
      </div>
    </article>
  );
}

function KpiTile({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5">{icon}{label}</div>
      <div className={`text-2xl font-extrabold ${color ?? 'text-navy-900'}`}>{value}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return <span><strong className="text-navy-800">{value}</strong> {label}</span>;
}
function StatusPill({ s }: { s: string }) {
  const cls =
    s === 'approved' ? 'bg-emerald-100 text-emerald-700' :
    s === 'rejected' ? 'bg-rose-100 text-rose-700' :
    s === 'changes_requested' ? 'bg-amber-100 text-amber-800' :
    'bg-blue-100 text-blue-700';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {s === 'pending' && <AlertTriangle size={10} />}
      {s.replace(/_/g, ' ')}
    </span>
  );
}
