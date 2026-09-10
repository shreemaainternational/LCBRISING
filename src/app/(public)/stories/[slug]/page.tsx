import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, MapPin, Quote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { renderMarkdown } from '@/lib/markdown';
import { causeForCategory } from '@/lib/causes';
import { ReadingProgress } from '@/components/site/ReadingProgress';
import { ShareBar } from '@/components/site/ShareBar';

export const revalidate = 300;

type Story = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  beneficiary_name: string | null;
  beneficiary_age: number | null;
  location: string | null;
  hero_image: string | null;
  before_image: string | null;
  after_image: string | null;
  body: string | null;
  impact_quote: string | null;
  impact_metric: string | null;
  tags: string[] | null;
  published_at: string | null;
  campaign_id: string | null;
  activity_id: string | null;
};

type RelatedCampaign = { title: string; slug: string };
type RelatedActivity = { title: string; category: string | null };

async function getStory(slug: string): Promise<Story | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stories')
      .select(
        'id, slug, title, subtitle, beneficiary_name, beneficiary_age, location, hero_image, before_image, after_image, body, impact_quote, impact_metric, tags, published_at, campaign_id, activity_id',
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle();
    return (data ?? null) as Story | null;
  } catch {
    return null;
  }
}

async function getRelatedCampaign(campaignId: string | null): Promise<RelatedCampaign | null> {
  if (!campaignId || !isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('campaigns')
      .select('title, slug')
      .eq('id', campaignId)
      .eq('is_active', true)
      .maybeSingle();
    return (data ?? null) as RelatedCampaign | null;
  } catch {
    return null;
  }
}

async function getRelatedActivity(activityId: string | null): Promise<RelatedActivity | null> {
  if (!activityId || !isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select('title, category')
      .eq('id', activityId)
      .maybeSingle();
    return (data ?? null) as RelatedActivity | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStory(slug);
  if (!s) return { title: 'Story not found' };
  const url = `${env.NEXT_PUBLIC_SITE_URL}/stories/${s.slug}`;
  return {
    title: s.title,
    description: s.subtitle ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: s.title,
      description: s.subtitle ?? undefined,
      type: 'article',
      url,
      images: s.hero_image ? [{ url: s.hero_image }] : undefined,
    },
  };
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();
  const canonical = `${env.NEXT_PUBLIC_SITE_URL}/stories/${story.slug}`;
  const body = story.body ? renderMarkdown(story.body) : '';
  const [relatedCampaign, relatedActivity] = await Promise.all([
    getRelatedCampaign(story.campaign_id),
    getRelatedActivity(story.activity_id),
  ]);

  return (
    <>
      <ReadingProgress />

      <header className="relative isolate text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {story.hero_image ? (
            <Image
              src={story.hero_image}
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
            href="/stories"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft size={14} /> Back to stories
          </Link>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
            {story.title}
          </h1>
          {story.subtitle && (
            <p className="mt-5 text-lg md:text-xl text-white/90 leading-relaxed drop-shadow">
              {story.subtitle}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
            {story.beneficiary_name && (
              <span>
                <span className="text-white/60 uppercase tracking-wider text-xs mr-2">Spotlight</span>
                {story.beneficiary_name}
                {story.beneficiary_age ? `, ${story.beneficiary_age}` : ''}
              </span>
            )}
            {story.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden /> {story.location}
              </span>
            )}
          </div>
        </div>
      </header>

      <article className="bg-white">
        <div className="container-page py-12 md:py-16 max-w-3xl">
          {story.impact_quote && (
            <figure className="my-2 mb-10 relative rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-white p-8 md:p-10">
              <Quote size={42} aria-hidden className="absolute -top-4 -left-2 text-brand-400" />
              <blockquote className="text-xl md:text-2xl font-medium leading-snug">
                {story.impact_quote}
              </blockquote>
            </figure>
          )}

          {(story.before_image || story.after_image) && (
            <div className="grid grid-cols-2 gap-3 my-8">
              {[
                { label: 'Before', src: story.before_image },
                { label: 'After', src: story.after_image },
              ]
                .filter((x) => x.src)
                .map((x) => (
                  <figure key={x.label} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.src as string} alt={x.label} className="w-full rounded-xl" />
                    <figcaption className="absolute top-3 left-3 bg-white/95 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {x.label}
                    </figcaption>
                  </figure>
                ))}
            </div>
          )}

          {body ? (
            <div
              className="prose-like text-[17px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="text-gray-500 italic">More from this story is coming soon.</p>
          )}

          {story.impact_metric && (
            <div className="mt-10 rounded-2xl bg-brand-50 border border-brand-200 p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">
                Programme Impact
              </p>
              <p className="mt-2 text-2xl font-bold text-navy-900">{story.impact_metric}</p>
            </div>
          )}

          {(relatedCampaign || relatedActivity) && (
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {relatedCampaign && (
                <Link
                  href={`/campaigns/${relatedCampaign.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                      Related Campaign
                    </p>
                    <p className="font-semibold text-navy-800 mt-1">{relatedCampaign.title}</p>
                  </div>
                  <ArrowRight size={16} className="text-brand-600 flex-shrink-0" aria-hidden />
                </Link>
              )}
              {relatedActivity && (
                <Link
                  href={`/activities/${causeForCategory(relatedActivity.category).slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                      Related Service Activity
                    </p>
                    <p className="font-semibold text-navy-800 mt-1">{relatedActivity.title}</p>
                  </div>
                  <ArrowRight size={16} className="text-brand-600 flex-shrink-0" aria-hidden />
                </Link>
              )}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <ShareBar url={canonical} title={story.title} />
            <Link href="/donate" className="btn-gold inline-flex h-11 px-6 rounded-md items-center">
              Support this work
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
