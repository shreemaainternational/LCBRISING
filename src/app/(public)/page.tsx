import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { collectActivityPhotos, type ActivityMediaRow } from '@/lib/activity-media';
import { HeroSlideshow } from '@/components/site/HeroSlideshow';
import { StatsBanner } from '@/components/site/StatsBanner';
import { AboutSection } from '@/components/site/AboutSection';
import { FeaturedActivities } from '@/components/site/FeaturedActivities';
import { UpcomingEventsStrip } from '@/components/site/UpcomingEventsStrip';
import { TestimonialsGrid } from '@/components/site/TestimonialsGrid';
import { DonateCTABanner } from '@/components/site/DonateCTABanner';
import { DonationThermometer } from '@/components/site/DonationThermometer';
import { NewsletterSignup } from '@/components/site/NewsletterSignup';
import { FinalCTA } from '@/components/site/FinalCTA';
import { RecentActivities } from '@/components/site/RecentActivities';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 300; // ISR: refresh every 5 min

async function getStats() {
  if (!isSupabaseConfigured()) {
    return { members: 0, activities: 0, donations: 0, beneficiaries: 0 };
  }
  try {
    // Public homepage aggregates. Use the service-role client for these
    // read-only counts so the active-member count bypasses RLS: the members
    // SELECT policy is self-referential where migration 0059 is unapplied, so
    // under the anon client this count errors and the banner falls back to its
    // display floor (showing "92+" instead of the real roster). Only aggregate
    // public stats are read here; no per-member data leaves the server.
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const [
      { count: members },
      { count: activities },
      { data: donationsAgg },
      { data: activityAgg },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
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
      .select('id, title, description, beneficiaries, lion_members_count, service_hours, date, location, photos, before_photos, after_photos, videos')
      .order('date', { ascending: false })
      .limit(3);
    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      location: a.location,
      beneficiaries: a.beneficiaries,
      lionMembers: a.lion_members_count,
      serviceHours: a.service_hours,
      photos: collectActivityPhotos(a as ActivityMediaRow),
    }));
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

      {/* Featured Service Activities — 3-card grid ("Our Work") */}
      <FeaturedActivities />

      {/* Donate CTA banner — sits right below "Our Work" */}
      <DonateCTABanner />

      {/* Upcoming Events strip (auto-hides if no public future events) */}
      <UpcomingEventsStrip />

      {/* Recent Activities — cards open a detail popup with photos + full report */}
      <RecentActivities activities={activities} />

      {/* Donation thermometer */}
      <section className="container-page py-10">
        <DonationThermometer />
      </section>

      {/* Testimonials — "Voices of Impact" 3-card grid */}
      <TestimonialsGrid />

      {/* Newsletter capture — final conversion */}
      <NewsletterSignup />

      {/* Closing CTA — last section before the footer */}
      <FinalCTA />
    </>
  );
}

