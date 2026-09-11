import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Heart, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { formatINR, formatINRShort } from '@/lib/utils';
import { CampaignsGrid } from './CampaignsGrid';

export const metadata: Metadata = {
  title: 'Campaigns',
  description:
    'Active fundraising and service campaigns from Lions Club Baroda Rising Star. Join us in eye care, hunger relief, education, disaster response, and more.',
  // The sitemap lists per-campaign URLs as ?focus=<slug> query params; point
  // them all back to the canonical /campaigns page to avoid duplicate content.
  alternates: { canonical: '/campaigns' },
};
export const revalidate = 120;

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  goal_amount: number;
  starts_at: string | null;
  ends_at: string | null;
  hero_image: string | null;
  urgency: string | null;
  impact_metric: string | null;
  is_featured: boolean | null;
  category: string | null;
  match_campaign: boolean;
};

type Donation = { campaign_id: string | null; amount: number };

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

async function loadCampaigns(): Promise<{
  campaigns: Campaign[];
  raised: Map<string, number>;
}> {
  if (!isSupabaseConfigured()) return { campaigns: [], raised: new Map() };
  try {
    const supabase = await createClient();
    const [{ data: campaigns }, { data: donations }] = await Promise.all([
      supabase
        .from('campaigns')
        .select(
          'id, slug, title, description, tagline, goal_amount, starts_at, ends_at, hero_image, urgency, impact_metric, is_featured, category, match_campaign',
        )
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('donations').select('campaign_id, amount').not('campaign_id', 'is', null),
    ]);
    const raised = new Map<string, number>();
    for (const d of ((donations ?? []) as Donation[])) {
      if (!d.campaign_id) continue;
      raised.set(d.campaign_id, (raised.get(d.campaign_id) ?? 0) + Number(d.amount ?? 0));
    }
    return { campaigns: (campaigns ?? []) as Campaign[], raised };
  } catch {
    return { campaigns: [], raised: new Map() };
  }
}

export default async function CampaignsPage() {
  const { campaigns, raised } = await loadCampaigns();

  const urgent = campaigns.find((c) => c.urgency === 'urgent' || c.urgency === 'emergency');
  const featured = campaigns.find((c) => c.is_featured) ?? campaigns[0];
  const grid = campaigns.filter((c) => c.id !== featured?.id);

  return (
    <>
      <PageHero
        pillText="ACTIVE CAMPAIGNS"
        headline="Causes that need you, today."
        subtitle="Each campaign is a clear, time-bound goal — your contribution is tracked end-to-end and reported with named beneficiaries."
        backgroundImage={PAGE_HERO_BG.donate}
      />

      {urgent && <UrgentBanner campaign={urgent} raised={raised.get(urgent.id) ?? 0} />}

      {featured && <FeaturedCampaign campaign={featured} raised={raised.get(featured.id) ?? 0} />}

      <section className="bg-gray-50 py-14">
        <div className="container-page">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900">All active campaigns</h2>
              <p className="text-gray-600 mt-1">Choose a cause and contribute toward a real, named goal.</p>
            </div>
            <Link
              href="/donate"
              className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-brand-600"
            >
              General donation <ArrowRight size={14} />
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <EmptyCampaigns />
          ) : (
            <CampaignsGrid
              campaigns={grid.map((c) => ({
                id: c.id,
                slug: c.slug,
                title: c.title,
                description: c.description,
                tagline: c.tagline,
                goal_amount: Number(c.goal_amount),
                ends_at: c.ends_at,
                hero_image: c.hero_image,
                urgency: c.urgency,
                category: c.category,
                match_campaign: c.match_campaign,
                raised: raised.get(c.id) ?? 0,
              }))}
            />
          )}
        </div>
      </section>
    </>
  );
}

function UrgentBanner({ campaign, raised }: { campaign: Campaign; raised: number }) {
  return (
    <div className="bg-red-700 text-white">
      <div className="container-page py-3 flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <AlertCircle size={14} aria-hidden /> Emergency Appeal
        </span>
        <span className="text-sm flex-1 min-w-[200px]">
          <Link href={`/campaigns/${campaign.slug}`} className="font-bold mr-2 underline decoration-2 underline-offset-4">
            {campaign.title}
          </Link>
          {campaign.tagline ?? campaign.description ?? ''}
        </span>
        <Link
          href={`/donate?campaign=${campaign.slug}`}
          className="text-sm font-bold underline decoration-2 underline-offset-4"
        >
          Donate now ({formatINRShort(raised)} raised)
        </Link>
      </div>
    </div>
  );
}

function FeaturedCampaign({ campaign, raised }: { campaign: Campaign; raised: number }) {
  const pct = campaign.goal_amount > 0 ? Math.min(100, (raised / campaign.goal_amount) * 100) : 0;
  return (
    <section className="bg-white py-14">
      <div className="container-page grid md:grid-cols-2 gap-10 items-center">
        <div className="relative aspect-[5/4] rounded-3xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.hero_image || FALLBACK_HERO}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
          {campaign.category && (
            <span className="absolute top-4 left-4 bg-brand-500 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              {campaign.category}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-600 font-semibold">
            Featured Campaign
          </p>
          <h2 className="mt-2 text-3xl md:text-5xl font-bold text-navy-900 leading-tight">
            <Link href={`/campaigns/${campaign.slug}`} className="hover:text-brand-600">
              {campaign.title}
            </Link>
          </h2>
          {(campaign.tagline ?? campaign.description) && (
            <p className="mt-4 text-lg text-gray-700 leading-relaxed">
              {campaign.tagline ?? campaign.description}
            </p>
          )}

          <div className="mt-6">
            <div className="flex justify-between text-sm font-semibold text-navy-900">
              <span>{formatINR(raised)} raised</span>
              <span className="text-gray-500">of {formatINR(Number(campaign.goal_amount))}</span>
            </div>
            <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            {campaign.impact_metric && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-brand-700 font-semibold">
                <Target size={14} /> {campaign.impact_metric}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/donate?campaign=${campaign.slug}`}
              className="btn-gold inline-flex h-12 px-6 rounded-md items-center"
            >
              <Heart size={16} className="mr-1" aria-hidden /> Donate
            </Link>
            <Link
              href={`/campaigns/${campaign.slug}`}
              className="btn-navy inline-flex h-12 px-6 rounded-md items-center"
            >
              View full campaign
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyCampaigns() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <Heart size={32} className="mx-auto text-gray-400 mb-3" aria-hidden />
      <p className="text-gray-600">No active campaigns right now. Check back shortly.</p>
      <Link
        href="/donate"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-brand-600"
      >
        Make a general donation <ArrowRight size={14} />
      </Link>
    </div>
  );
}
