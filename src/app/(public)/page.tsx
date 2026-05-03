import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatINR } from '@/lib/utils';
import { Heart, Users, Activity as ActivityIcon, Award } from 'lucide-react';

export const revalidate = 300; // ISR: refresh every 5 min

async function getStats() {
  try {
    const supabase = await createClient();
    const [{ count: members }, { count: activities }, { data: donationsAgg }] =
      await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('activities').select('*', { count: 'exact', head: true }),
        supabase.from('donations').select('amount'),
      ]);
    const totalDonations = (donationsAgg ?? []).reduce((s, d) => s + Number(d.amount), 0);
    return {
      members: members ?? 0,
      activities: activities ?? 0,
      donations: totalDonations,
    };
  } catch {
    return { members: 0, activities: 0, donations: 0 };
  }
}

async function getRecentActivities() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select('id, title, description, beneficiaries, date, location')
      .order('date', { ascending: false })
      .limit(3);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [stats, activities] = await Promise.all([getStats(), getRecentActivities()]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white">
        <div className="container-page py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block bg-brand-500 text-navy-900 px-3 py-1 rounded-full text-xs font-bold mb-4">
              DISTRICT 323-E · INDIA
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
              We Serve.<br />
              <span className="text-brand-400">Together we rise.</span>
            </h1>
            <p className="text-lg text-gray-200 mb-8 max-w-xl">
              The Lions Club of Baroda Rising Star unites volunteers across
              Vadodara to deliver healthcare, education, and disaster-relief
              programs to those who need them most.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="primary" size="lg">
                <Link href="/donate">Donate Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-navy-900">
                <Link href="/contact">Become a Member</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block text-[14rem] text-center opacity-90">🦁</div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-page py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="text-brand-500" />} label="Active Members" value={String(stats.members)} />
          <StatCard icon={<ActivityIcon className="text-brand-500" />} label="Service Projects" value={String(stats.activities)} />
          <StatCard icon={<Heart className="text-brand-500" />} label="Funds Raised" value={formatINR(stats.donations)} />
          <StatCard icon={<Award className="text-brand-500" />} label="Years Serving" value="15+" />
        </div>
      </section>

      {/* Recent Activities */}
      <section className="container-page py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-navy-800">Recent Activities</h2>
            <p className="text-gray-600 mt-2">A glimpse of our service in action.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/activities">View all</Link>
          </Button>
        </div>

        {activities.length === 0 ? (
          <p className="text-gray-500">Activities will appear here once added.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {activities.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-6">
                  <div className="text-xs text-brand-600 font-medium mb-1">{formatDate(a.date)}</div>
                  <h3 className="font-semibold text-lg text-navy-800 mb-2">{a.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{a.description ?? ''}</p>
                  <div className="text-xs text-gray-500 mt-4">
                    {a.beneficiaries} beneficiaries · {a.location ?? 'Vadodara'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-brand-500 text-navy-900 mt-16">
        <div className="container-page py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Your contribution changes lives.</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Every rupee funds eye-camps, blood drives, scholarships, and food for the underprivileged.
          </p>
          <Button asChild size="lg" className="bg-navy-900 text-white hover:bg-navy-800">
            <Link href="/donate">Donate Today</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-navy-800">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
