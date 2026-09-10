import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Heart, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { renderMarkdown } from '@/lib/markdown';
import { formatINR, formatDate } from '@/lib/utils';
import { causeForCategory } from '@/lib/causes';
import { ReadingProgress } from '@/components/site/ReadingProgress';
import { ShareBar } from '@/components/site/ShareBar';

export const revalidate = 120;

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  goal_amount: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  hero_image: string | null;
  urgency: string | null;
  impact_metric: string | null;
  category: string | null;
  match_campaign: boolean;
  is_active: boolean;
};

type LinkedActivity = {
  id: string;
  title: string;
  category: string | null;
  date: string;
  location: string | null;
  beneficiaries: number;
  lion_members_count: number | null;
  leo_members_count: number | null;
  service_hours: number;
  expenses: number | null;
};

type RelatedStory = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image: string | null;
};

async function getCampaign(slug: string): Promise<Campaign | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('campaigns')
      .select(
        'id, slug, title, description, tagline, goal_amount, currency, starts_at, ends_at, hero_image, urgency, impact_metric, category, match_campaign, is_active',
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    return (data ?? null) as Campaign | null;
  } catch {
    return null;
  }
}

async function getRaised(campaignId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('donations')
      .select('amount')
      .eq('campaign_id', campaignId);
    return (data ?? []).reduce((sum, d) => sum + Number((d as { amount: number }).amount ?? 0), 0);
  } catch {
    return 0;
  }
}

async function getLinkedActivities(campaignId: string): Promise<LinkedActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data: links } = await supabase
      .from('campaign_activities')
      .select('activity_id')
      .eq('campaign_id', campaignId);
    const ids = (links ?? []).map((l) => (l as { activity_id: string }).activity_id);
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from('activities')
      .select(
        'id, title, category, date, location, beneficiaries, lion_members_count, leo_members_count, service_hours, expenses',
      )
      .in('id', ids)
      .order('date', { ascending: false });
    return (data ?? []) as LinkedActivity[];
  } catch {
    return [];
  }
}

async function getRelatedStories(campaignId: string): Promise<RelatedStory[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stories')
      .select('id, slug, title, subtitle, hero_image')
      .eq('campaign_id', campaignId)
      .eq('is_published', true)
      .is('deleted_at', null)
      .limit(6);
    return (data ?? []) as RelatedStory[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) return { title: 'Campaign not found' };
  const url = `${env.NEXT_PUBLIC_SITE_URL}/campaigns/${campaign.slug}`;
  const description =
    campaign.tagline ?? campaign.description ?? 'A fundraising campaign by Lions Club Baroda Rising Star.';
  return {
    title: campaign.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: campaign.title,
      description,
      type: 'website',
      url,
      images: campaign.hero_image ? [{ url: campaign.hero_image }] : undefined,
    },
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  const [raised, activities, relatedStories] = await Promise.all([
    getRaised(campaign.id),
    getLinkedActivities(campaign.id),
    getRelatedStories(campaign.id),
  ]);

  const canonical = `${env.NEXT_PUBLIC_SITE_URL}/campaigns/${campaign.slug}`;
  const pct = campaign.goal_amount > 0 ? Math.min(100, Math.round((raised / campaign.goal_amount) * 100)) : 0;
  const description = campaign.description ? renderMarkdown(campaign.description) : '';

  const totals = activities.reduce(
    (acc, a) => ({
      beneficiaries: acc.beneficiaries + Number(a.beneficiaries ?? 0),
      volunteers: acc.volunteers + Number(a.lion_members_count ?? 0) + Number(a.leo_members_count ?? 0),
      lionHours: acc.lionHours + Number(a.service_hours ?? 0),
      expenses: acc.expenses + Number(a.expenses ?? 0),
    }),
    { beneficiaries: 0, volunteers: 0, lionHours: 0, expenses: 0 },
  );

  return (
    <>
      <ReadingProgress />

      <header className="relative isolate text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {campaign.hero_image ? (
            <Image
              src={campaign.hero_image}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-navy-900 to-navy-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/40 via-navy-900/60 to-navy-900/95" />
        </div>

        <div className="container-page pt-24 pb-16 md:pt-32 md:pb-24 max-w-4xl">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft size={14} /> Back to campaigns
          </Link>

          {campaign.category && (
            <span className="inline-block bg-brand-500/95 text-navy-900 text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full">
              {campaign.category}
            </span>
          )}

          <h1 className="mt-5 text-3xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
            {campaign.title}
          </h1>
          {(campaign.tagline ?? campaign.description) && (
            <p className="mt-5 text-lg md:text-xl text-white/90 leading-relaxed drop-shadow max-w-3xl">
              {campaign.tagline ?? campaign.description}
            </p>
          )}

          <div className="mt-8 max-w-md">
            <div className="flex justify-between text-sm font-semibold">
              <span>{formatINR(raised)} raised</span>
              <span className="text-white/70">of {formatINR(Number(campaign.goal_amount))}</span>
            </div>
            <div className="mt-2 h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/donate?campaign=${campaign.slug}`}
              className="btn-gold inline-flex h-12 px-6 rounded-md items-center"
            >
              <Heart size={16} className="mr-1" aria-hidden /> Donate
            </Link>
          </div>
        </div>
      </header>

      <article className="bg-white">
        <div className="container-page py-12 md:py-16 max-w-3xl">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 mb-8">
            {campaign.starts_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden /> Started {formatDate(campaign.starts_at)}
              </span>
            )}
            {campaign.ends_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden /> Closes {formatDate(campaign.ends_at)}
              </span>
            )}
          </div>

          {description ? (
            <div
              className="prose-like text-[17px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-gray-500 italic">More details about this campaign are coming soon.</p>
          )}

          {campaign.impact_metric && (
            <div className="mt-10 rounded-2xl bg-brand-50 border border-brand-200 p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">
                Programme Impact
              </p>
              <p className="mt-2 text-2xl font-bold text-navy-900">{campaign.impact_metric}</p>
            </div>
          )}

          {/* Campaign statistics — computed only from real linked activities */}
          {activities.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-navy-900 mb-4">Campaign statistics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Activities" value={String(activities.length)} />
                <Stat label="Beneficiaries" value={totals.beneficiaries.toLocaleString('en-IN')} />
                <Stat label="Volunteers" value={totals.volunteers.toLocaleString('en-IN')} />
                <Stat label="Lion hours" value={totals.lionHours.toLocaleString('en-IN')} />
              </div>
            </div>
          )}

          {/* Related activities */}
          {activities.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-navy-900 mb-4">Related service activities</h2>
              <div className="space-y-3">
                {activities.map((a) => {
                  const cause = causeForCategory(a.category);
                  return (
                    <Link
                      key={a.id}
                      href={`/activities/${cause.slug}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-navy-800">{a.title}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(a.date)}
                          </span>
                          {a.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {a.location}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-navy-700 flex-shrink-0">
                        View activity →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <ShareBar url={canonical} title={campaign.title} />
            <Link href={`/donate?campaign=${campaign.slug}`} className="btn-gold inline-flex h-11 px-6 rounded-md items-center">
              <Heart size={14} className="mr-1.5" aria-hidden /> Donate to this campaign
            </Link>
          </div>
        </div>
      </article>

      {/* Related stories */}
      {relatedStories.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="container-page">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
                Stories from this campaign
              </h2>
              <Link href="/stories" className="text-sm font-semibold text-navy-800 hover:text-brand-600">
                All stories →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedStories.map((s) => (
                <Link
                  key={s.id}
                  href={`/stories/${s.slug}`}
                  className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                    {s.hero_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.hero_image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-navy-800 group-hover:text-brand-600 line-clamp-2">
                      {s.title}
                    </h3>
                    {s.subtitle && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{s.subtitle}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">{label}</p>
    </div>
  );
}
