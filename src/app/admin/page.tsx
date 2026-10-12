import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { formatINR } from '@/lib/utils';
import { Users, Banknote, HeartHandshake, Activity as ActivityIcon, Calendar } from 'lucide-react';
import {
  DonationTrendChart,
  MembershipPieChart,
  ActivitiesByCategoryChart,
} from './DashboardCharts';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';
import { KpiCard, WorkflowPipeline, ActionQueue, type PipelineStage } from '@/components/admin/crm/widgets';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  // This page lives inside the admin-gated layout. Read via the service-role
  // client so the member-count queries bypass RLS: the members SELECT policy is
  // self-referential on databases where migration 0059 has not been applied, so
  // under the invoker client those counts error out and render as 0 (which is
  // why "Total Members" showed 0 while Activities — a public-read table —
  // counted fine). Bypassing RLS here reports the true counts.
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const countActivities = (status: string) =>
    supabase.from('activities').select('*', { count: 'exact', head: true }).eq('approval_status', status);

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: lapsedMembers },
    { count: pendingMembers },
    { data: donations },
    { count: activities },
    { data: pendingDues },
    { data: recentDonations },
    { data: activityRows },
    { count: actPending },
    { count: actChanges },
    { count: actApproved },
    { count: actRejected },
    { count: upcomingEvents },
    { count: beneficiaryRecords },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'lapsed'),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
    supabase.from('donations').select('amount, created_at'),
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('dues').select('amount').eq('status', 'pending'),
    supabase.from('donations').select('id, donor_name, amount, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('activities').select('category, beneficiaries, service_hours'),
    countActivities('pending'),
    countActivities('changes_requested'),
    countActivities('approved'),
    countActivities('rejected'),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', today),
    supabase.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ]);

  const totalDonations = (donations ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const pendingDuesAmt = (pendingDues ?? []).reduce((s, d) => s + Number(d.amount), 0);

  const trend = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trend.set(d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), 0);
  }
  for (const d of donations ?? []) {
    const dt = new Date(d.created_at);
    const key = dt.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + Number(d.amount));
  }

  type Row = { category: string | null; beneficiaries: number | null; service_hours: number | string | null };
  const cats = new Map<string, { count: number; beneficiaries: number }>();
  let peopleServed = 0;
  let serviceHours = 0;
  for (const a of (activityRows ?? []) as Row[]) {
    const c = (a.category ?? 'other').toLowerCase();
    const cur = cats.get(c) ?? { count: 0, beneficiaries: 0 };
    const b = Number(a.beneficiaries ?? 0);
    peopleServed += b;
    serviceHours += Number(a.service_hours ?? 0);
    cats.set(c, { count: cur.count + 1, beneficiaries: cur.beneficiaries + b });
  }
  const catChart = Array.from(cats.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    lapsedMembers: lapsedMembers ?? 0,
    pendingMembers: pendingMembers ?? 0,
    totalDonations,
    pendingDuesAmt,
    pendingDuesCount: pendingDues?.length ?? 0,
    activities: activities ?? 0,
    recentDonations: recentDonations ?? [],
    trend: Array.from(trend.entries()).map(([month, amount]) => ({ month, amount })),
    catChart,
    peopleServed,
    serviceHours,
    upcomingEvents: upcomingEvents ?? 0,
    beneficiaryRecords: beneficiaryRecords ?? 0,
    pipeline: {
      pending: actPending ?? 0,
      changes: actChanges ?? 0,
      approved: actApproved ?? 0,
      rejected: actRejected ?? 0,
    },
  };
}

export default async function AdminDashboard() {
  await requireAdminPage();
  const d = await getDashboardData();

  const stages: PipelineStage[] = [
    { key: 'pending',  label: 'Submitted',         count: d.pipeline.pending,  tone: 'amber',  href: '/admin/activities?status=pending', hint: 'awaiting review' },
    { key: 'changes',  label: 'Changes requested', count: d.pipeline.changes,  tone: 'orange', href: '/admin/activities?status=changes_requested', hint: 'back with club' },
    { key: 'approved', label: 'Approved',          count: d.pipeline.approved, tone: 'green',  href: '/admin/activities?status=approved', hint: 'counted in reports' },
    { key: 'rejected', label: 'Rejected',          count: d.pipeline.rejected, tone: 'red',    href: '/admin/activities?status=rejected' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <div className="crm-eyebrow mb-1">Rising Star CRM</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-[var(--crm-muted)]">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={Users} label="Members" value={String(d.totalMembers)} sub={`${d.activeMembers} active · ${d.lapsedMembers} lapsed`} href="/admin/members" />
        <KpiCard icon={HeartHandshake} label="Donations" value={formatINR(d.totalDonations)} sub="lifetime" tone="gold" href="/admin/donations" />
        <KpiCard icon={Banknote} label="Pending dues" value={formatINR(d.pendingDuesAmt)} sub={`${d.pendingDuesCount} invoices outstanding`} tone="rose" href="/admin/dues" />
        <KpiCard icon={ActivityIcon} label="Service activities" value={String(d.activities)} sub={`${d.serviceHours.toLocaleString('en-IN')} service hours`} tone="green" href="/admin/activities" />
        <KpiCard icon={Calendar} label="Upcoming events" value={String(d.upcomingEvents)} sub="from today" href="/admin/events" />
      </div>

      {/* NGO workflow: activity lifecycle + human queue */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WorkflowPipeline
            title="Service activity pipeline"
            stages={stages}
            footer={
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="crm-eyebrow">People served (reported)</div>
                  <div className="text-lg font-bold crm-num">{d.peopleServed.toLocaleString('en-IN')}</div>
                </div>
                <Link href="/admin/beneficiaries" className="rounded-lg bg-slate-50 p-3 hover:bg-slate-100">
                  <div className="crm-eyebrow">Beneficiary records</div>
                  <div className="text-lg font-bold crm-num">{d.beneficiaryRecords.toLocaleString('en-IN')}</div>
                </Link>
              </div>
            }
          />
        </div>
        <ActionQueue
          items={[
            { label: 'Activities awaiting approval', count: d.pipeline.pending, href: '/admin/activities?status=pending', detail: 'Review and approve club submissions' },
            { label: 'Activities sent back for changes', count: d.pipeline.changes, href: '/admin/activities?status=changes_requested' },
            { label: 'Membership applications', count: d.pendingMembers, href: '/admin/members', detail: 'Pending member status' },
            { label: 'Unpaid dues', count: d.pendingDuesCount, href: '/admin/dues', detail: formatINR(d.pendingDuesAmt) },
          ]}
        />
      </div>

      <QuickActionsBar />

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="crm-panel p-5 lg:col-span-2">
          <h2 className="font-semibold mb-4">Donation trend · last 12 months</h2>
          <DonationTrendChart data={d.trend} />
        </section>
        <section className="crm-panel p-5">
          <h2 className="font-semibold mb-4">Membership status</h2>
          <MembershipPieChart active={d.activeMembers} lapsed={d.lapsedMembers} pending={d.pendingMembers} />
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="crm-panel p-5 lg:col-span-2">
          <h2 className="font-semibold mb-4">Activities by cause</h2>
          {d.catChart.length === 0 ? (
            <p className="text-center text-sm text-[var(--crm-muted)] py-8">No activities recorded yet.</p>
          ) : (
            <ActivitiesByCategoryChart data={d.catChart} />
          )}
        </section>

        <section className="crm-panel overflow-hidden">
          <div className="flex items-baseline justify-between p-5 pb-3">
            <h2 className="font-semibold">Recent donations</h2>
            <Link href="/admin/donations" className="text-xs font-medium text-navy-700 hover:underline">View all</Link>
          </div>
          {d.recentDonations.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-[var(--crm-muted)]">No donations yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--crm-border)]">
              {d.recentDonations.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.donor_name}</div>
                    <div className="text-xs text-[var(--crm-muted)]">{new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="font-semibold crm-num">{formatINR(Number(r.amount))}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
