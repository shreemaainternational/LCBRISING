import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDate } from '@/lib/utils';
import { HeroSlideshow } from '@/components/site/HeroSlideshow';
import { StatsBanner } from '@/components/site/StatsBanner';
import { AboutSection } from '@/components/site/AboutSection';
import { FeaturedActivities } from '@/components/site/FeaturedActivities';
import { UpcomingEventsStrip } from '@/components/site/UpcomingEventsStrip';
import { TestimonialsCarousel } from '@/components/site/TestimonialsCarousel';
import { DonateCTABanner } from '@/components/site/DonateCTABanner';
import { NewsletterSignup } from '@/components/site/NewsletterSignup';

export const revalidate = 300; // ISR: refresh every 5 min

async function getStats() {
  if (!isSupabaseConfigured()) {
    return { members: 0, activities: 0, donations: 0, beneficiaries: 0 };
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
      supabase.from('activities').select('beneficiaries'),
    ]);
    const totalDonations = (donationsAgg ?? []).reduce((s, d) => s + Number(d.amount), 0);
    const totalBeneficiaries = (activityAgg ?? []).reduce(
      (s, a) => s + Number((a as { beneficiaries?: number }).beneficiaries ?? 0),
      0,
    );
    return {
      members: members ?? 0,
      activities: activities ?? 0,
      donations: totalDonations,
      beneficiaries: totalBeneficiaries,
    };
  } catch {
    return { members: 0, activities: 0, donations: 0, beneficiaries: 0 };
  }
}

async function getRecentActivities() {
  if (!isSupabaseConfigured()) return [];
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
      {/* Rotating hero slideshow + overlapping stats banner */}
      <HeroSlideshow />
      <StatsBanner
        activeMembers={stats.members}
        totalActivities={stats.activities}
        livesImpacted={stats.beneficiaries}
        fundsRaised={stats.donations}
      />

      {/* About Us section — 2x2 collage with years badge */}
      <AboutSection />

      {/* Featured Service Activities — 3-card grid */}
      <FeaturedActivities />

      {/* Upcoming Events strip (auto-hides if no public future events) */}
      <UpcomingEventsStrip />

      {/* Testimonials — rotating quotes */}
      <TestimonialsCarousel />

      {/* Primary donation conversion moment */}
      <DonateCTABanner />

      {/* Newsletter capture */}
      <NewsletterSignup />

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

