import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, Users, Activity as ActivityIcon, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { Counter } from '@/components/site/Counter';
import { formatINRShort } from '@/lib/utils';
import { activityCategoryLabel } from '@/lib/activity-categories';

export const metadata: Metadata = {
  title: 'Impact Dashboard',
  description:
    'Lions Club Baroda Rising Star impact at a glance — live counters of lives reached, members serving, activities completed, and funds raised. With downloadable annual reports.',
  alternates: { canonical: '/impact' },
};
export const revalidate = 300;

type CauseAggRow = {
  category: string | null;
  beneficiaries: number | null;
};

async function loadImpact() {
  if (!isSupabaseConfigured()) {
    return {
      members: 0,
      activities: 0,
      donations: 0,
      beneficiaries: 0,
      categories: [] as { slug: string; name: string; beneficiaries: number; count: number }[],
    };
  }
  try {
    const supabase = await createClient();
    const [
      { count: members },
      { count: activities },
      { data: donationsAgg },
      { data: activityAgg },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('activities').select('*', { count: 'exact', head: true }),
      supabase.from('donations').select('amount'),
      supabase.from('activities').select('category, beneficiaries'),
    ]);

    const totalDonations = (donationsAgg ?? []).reduce(
      (s, d) => s + Number((d as { amount?: number }).amount ?? 0),
      0,
    );
    const totalBeneficiaries = (activityAgg ?? []).reduce(
      (s, a) => s + Number((a as { beneficiaries?: number }).beneficiaries ?? 0),
      0,
    );

    // Group activities by their real `category` (one row per category, not
    // rolled up to a cause) and sum beneficiaries + count per category.
    const byCategory = new Map<string, { beneficiaries: number; count: number }>();
    for (const row of ((activityAgg ?? []) as CauseAggRow[])) {
      const slug = (row.category ?? 'other').toLowerCase();
      const entry = byCategory.get(slug) ?? { beneficiaries: 0, count: 0 };
      entry.beneficiaries += Number(row.beneficiaries ?? 0);
      entry.count += 1;
      byCategory.set(slug, entry);
    }
    const categories = Array.from(byCategory.entries())
      .map(([slug, v]) => ({
        slug,
        name: activityCategoryLabel(slug),
        beneficiaries: v.beneficiaries,
        count: v.count,
      }))
      .sort((a, b) => b.beneficiaries - a.beneficiaries || b.count - a.count);

    return {
      members: members ?? 0,
      activities: activities ?? 0,
      donations: totalDonations,
      beneficiaries: totalBeneficiaries,
      categories,
    };
  } catch {
    return {
      members: 0,
      activities: 0,
      donations: 0,
      beneficiaries: 0,
      categories: [] as { slug: string; name: string; beneficiaries: number; count: number }[],
    };
  }
}

export default async function ImpactPage() {
  const stats = await loadImpact();

  return (
    <>
      <PageHero
        pillText="IMPACT DASHBOARD"
        headline="Our work, in real numbers."
        subtitle="Counters update as new activities, donations, and members are recorded. Audit-ready and transparent."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="bg-white py-14">
        <div className="container-page">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={HeartHandshake}
              label="Lives reached"
              value={stats.beneficiaries}
              tint="from-pink-500 to-rose-600"
            />
            <StatCard
              icon={Users}
              label="Active members"
              value={stats.members}
              tint="from-navy-700 to-navy-900"
            />
            <StatCard
              icon={ActivityIcon}
              label="Activities completed"
              value={stats.activities}
              tint="from-emerald-500 to-emerald-700"
            />
            <StatCard
              icon={Banknote}
              label="Funds raised"
              value={stats.donations}
              tint="from-brand-500 to-brand-700"
              formatter="inr"
            />
          </div>

          {stats.categories.length > 0 && (
            <div className="mt-12">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-bold text-navy-900">Impact by category</h2>
                <span className="text-sm text-gray-500">Tap a category to see its activities</span>
              </div>
              <div className="space-y-4">
                {stats.categories.map((c) => {
                  const max = Math.max(...stats.categories.map((x) => x.beneficiaries), 1);
                  const pct = (c.beneficiaries / max) * 100;
                  return (
                    <Link
                      key={c.slug}
                      href={`/activities/category/${c.slug}`}
                      className="block group"
                    >
                      <div className="flex justify-between text-sm font-semibold mb-1.5">
                        <span className="text-navy-900 group-hover:text-brand-600 transition-colors">
                          {c.name}
                        </span>
                        <span className="text-gray-600">
                          {c.beneficiaries > 0
                            ? `${c.beneficiaries.toLocaleString('en-IN')} lives`
                            : `${c.count} ${c.count === 1 ? 'activity' : 'activities'}`}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-14">
        <div className="container-page grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900">Audit-ready transparency</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Every rupee, every activity, every beneficiary is tracked inside our administrative
              system. Annual reports, donor-pack PDFs, and audit summaries are exported on demand —
              and the headline numbers above are the same numbers our committee sees.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/donate" className="btn-gold inline-flex h-12 px-6 rounded-md items-center">
                Donate now
              </Link>
              <Link href="/activities" className="btn-navy inline-flex h-12 px-6 rounded-md items-center">
                See activities <ArrowRight size={16} className="ml-1" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-bold text-navy-900 mb-4">What we measure</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li>• <strong>Beneficiaries</strong> recorded per activity, by named cause</li>
              <li>• <strong>Donations</strong> reconciled to receipts and campaigns</li>
              <li>• <strong>Activities</strong> approved through multi-tier officer workflow</li>
              <li>• <strong>Member service hours</strong> attributed at the club, zone, and district level</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  formatter,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tint: string;
  formatter?: 'inr';
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tint} text-white p-6`}>
      <Icon className="absolute -right-3 -bottom-3 opacity-15" size={120} aria-hidden />
      <p className="text-xs uppercase tracking-widest text-white/80">{label}</p>
      <p className="mt-2 text-3xl md:text-4xl font-bold">
        <Counter value={value} formatStyle={formatter === 'inr' ? 'inr' : 'plain'} />
      </p>
      {formatter === 'inr' && (
        <p className="mt-1 text-sm text-white/75">{formatINRShort(value)} total</p>
      )}
    </div>
  );
}
