import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/utils';
import { Users, Banknote, HeartHandshake, Activity as ActivityIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const supabase = await createClient();
  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: lapsedMembers },
    { data: donations },
    { count: activities },
    { data: pendingDues },
    { data: recentDonations },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'lapsed'),
    supabase.from('donations').select('amount, created_at'),
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('dues').select('amount').eq('status', 'pending'),
    supabase.from('donations').select('id, donor_name, amount, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalDonations = (donations ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const pendingDuesAmt = (pendingDues ?? []).reduce((s, d) => s + Number(d.amount), 0);

  // Build last-6-months donation trend
  const trend = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trend.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const d of donations ?? []) {
    const dt = new Date(d.created_at);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + Number(d.amount));
  }

  return {
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    lapsedMembers: lapsedMembers ?? 0,
    totalDonations,
    pendingDuesAmt,
    activities: activities ?? 0,
    recentDonations: recentDonations ?? [],
    trend: Array.from(trend.entries()).map(([k, v]) => ({ month: k, amount: v })),
  };
}

export default async function AdminDashboard() {
  const d = await getDashboardData();

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Dashboard</h1>
      <p className="text-gray-600 mb-8">Overview of club operations.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={<Users />} label="Total Members" value={String(d.totalMembers)} sub={`${d.activeMembers} active`} />
        <Stat icon={<HeartHandshake />} label="Donations" value={formatINR(d.totalDonations)} sub="lifetime" />
        <Stat icon={<Banknote />} label="Pending Dues" value={formatINR(d.pendingDuesAmt)} sub="outstanding" />
        <Stat icon={<ActivityIcon />} label="Activities" value={String(d.activities)} sub="all time" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Donation trend (6 months)</CardTitle></CardHeader>
          <CardContent>
            <SimpleBars data={d.trend} />
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

function SimpleBars({ data }: { data: { month: string; amount: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-2 h-48 px-2">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-brand-500 rounded-t"
            style={{ height: `${(d.amount / max) * 100}%`, minHeight: 2 }}
            title={`₹${d.amount}`}
          />
          <div className="text-[10px] text-gray-500">{d.month.slice(5)}/{d.month.slice(2,4)}</div>
        </div>
      ))}
    </div>
  );
}
