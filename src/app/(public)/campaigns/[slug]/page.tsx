import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart, Target, ArrowLeft, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { ShareCampaignButton, type CampaignLite } from '@/components/site/CampaignShare';
import { formatINR, formatINRShort, formatDate } from '@/lib/utils';

export const revalidate = 120;

type Campaign = CampaignLite & { is_active: boolean };

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

async function loadCampaign(slug: string): Promise<{ campaign: Campaign | null; raised: number }> {
  if (!isSupabaseConfigured()) return { campaign: null, raised: 0 };
  try {
    const supabase = await createClient();
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, slug, title, description, tagline, goal_amount, starts_at, ends_at, hero_image, urgency, impact_metric, is_featured, category, match_campaign, is_active')
      .eq('slug', slug)
      .maybeSingle();
    if (!campaign) return { campaign: null, raised: 0 };
    const { data: donations } = await supabase.from('donations').select('amount').eq('campaign_id', campaign.id);
    const raised = (donations ?? []).reduce((s, d) => s + Number(d.amount ?? 0), 0);
    return { campaign: campaign as Campaign, raised };
  } catch {
    return { campaign: null, raised: 0 };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { campaign, raised } = await loadCampaign(slug);
  if (!campaign) return { title: 'Campaign' };

  const goal = Number(campaign.goal_amount);
  const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;
  const summary = campaign.description ?? campaign.tagline ?? 'A Lions Club Baroda Rising Star campaign.';
  const description = `${summary} — ${formatINRShort(raised)} raised of ${formatINRShort(goal)} goal (${pct}%).${campaign.impact_metric ? ` ${campaign.impact_metric}.` : ''}`;
  const image = campaign.hero_image || FALLBACK_HERO;
  const url = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/campaigns/${campaign.slug}`;

  return {
    title: campaign.title,
    description,
    alternates: { canonical: `/campaigns/${campaign.slug}` },
    openGraph: {
      title: campaign.title,
      description,
      url,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: campaign.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: campaign.title,
      description,
      images: [image],
    },
  };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { campaign, raised } = await loadCampaign(slug);
  if (!campaign) notFound();

  const goal = Number(campaign.goal_amount);
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;

  return (
    <section className="bg-white py-10">
      <div className="container-page max-w-3xl">
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800 mb-5">
          <ArrowLeft size={14} /> All campaigns
        </Link>

        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.hero_image || FALLBACK_HERO} alt={campaign.title} className="w-full h-full object-cover" />
          {campaign.category && (
            <span className="absolute top-4 left-4 bg-brand-500 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              {campaign.category}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-3xl md:text-4xl font-bold text-navy-900">{campaign.title}</h1>
        {(campaign.description ?? campaign.tagline) && (
          <p className="mt-3 text-gray-700 leading-relaxed">{campaign.description ?? campaign.tagline}</p>
        )}

        <div className="mt-6">
          <div className="flex justify-between text-sm font-semibold text-navy-900">
            <span>{formatINR(raised)} raised</span>
            <span className="text-gray-500">of {formatINR(goal)}</span>
          </div>
          <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            {campaign.impact_metric ? (
              <span className="inline-flex items-center gap-1 text-brand-700 font-semibold"><Target size={13} /> {campaign.impact_metric}</span>
            ) : <span />}
            {campaign.ends_at && <span className="inline-flex items-center gap-1"><Calendar size={12} /> Closes {formatDate(campaign.ends_at)}</span>}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/donate?campaign=${campaign.slug}`} className="btn-gold inline-flex h-12 px-6 rounded-md items-center">
            <Heart size={16} className="mr-1" /> Donate now
          </Link>
          <ShareCampaignButton campaign={campaign} raised={raised} />
        </div>
      </div>
    </section>
  );
}
