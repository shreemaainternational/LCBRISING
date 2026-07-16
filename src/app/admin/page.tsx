import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { formatINR } from '@/lib/utils';
import { Users, Banknote, HeartHandshake, Activity as ActivityIcon } from 'lucide-react';
import {
  DonationTrendChart,
  MembershipPieChart,
  ActivitiesByCategoryChart,
} from './DashboardCharts';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  // Admin-only reads via the service-role client. Several of these tables
  // (members, dues) have self-referential RLS policies that trip "infinite
  // recursion detected in policy for relation members" under the user session
  // on databases missing migration 0059; the service role bypasses RLS.
  const supabase = createAdminClient();
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
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'lapsed'),
    supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
    supabase.from('donations').select('amount, created_at'),
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('dues').select('amount').eq('status', 'pending'),
    supabase.from('donations').select('id, donor_name, amount, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('activities').select('category, beneficiaries'),
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

  const cats = new Map<string, { count: number; beneficiaries: number }>();
  for (const a of (activityRows ?? []) as { category: string | null; beneficiaries: number | null }[]) {
    const c = (a.category ?? 'other').toLowerCase();
    const cur = cats.get(c) ?? { count: 0, beneficiaries: 0 };
    cats.set(c, {
      count: cur.count + 1,
      beneficiaries: cur.beneficiaries + Number(a.beneficiaries ?? 0),
    });
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
    activities: activities ?? 0,
    recentDonations: recentDonations ?? [],
    trend: Array.from(trend.entries()).map(([month, amount]) => ({ month, amount })),
    catChart,
  };
}

export default async function AdminDashboard() {
  await requireAdminPage();
  const d = await getDashboardData();

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Dashboard</h1>
      <p className="text-gray-600 mb-6">Overview of club operations.</p>

      <div className="mb-6">
        <QuickActionsBar />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={<Users />} label="Total Members" value={String(d.totalMembers)} sub={`${d.activeMembers} active`} />
        <Stat icon={<HeartHandshake />} label="Donations" value={formatINR(d.totalDonations)} sub="lifetime" />
        <Stat icon={<Banknote />} label="Pending Dues" value={formatINR(d.pendingDuesAmt)} sub="outstanding" />
        <Stat icon={<ActivityIcon />} label="Activities" value={String(d.activities)} sub="all time" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Donation trend (last 12 months)</CardTitle></CardHeader>
          <CardContent>
            <DonationTrendChart data={d.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Membership status</CardTitle></CardHeader>
          <CardContent>
            <MembershipPieChart
              active={d.activeMembers}
              lapsed={d.lapsedMembers}
              pending={d.pendingMembers}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Activities by category</CardTitle></CardHeader>
        <CardContent>
          {d.catChart.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No activities recorded yet.</p>
          ) : (
            <ActivitiesByCategoryChart data={d.catChart} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent donations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Donor</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {d.recentDonations.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-gray-500">No donations yet</td></tr>
              ) : d.recentDonations.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.donor_name}</td>
                  <td className="p-3 text-right">{formatINR(Number(r.amount))}</td>
                  <td className="p-3 text-right text-gray-500">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="text-brand-500">{icon}</div>
        <div>
          <div className="text-xs uppercase text-gray-500 tracking-wide">{label}</div>
          <div className="text-xl font-bold text-navy-800">{value}</div>
          {sub && <div className="text-xs text-gray-400">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
