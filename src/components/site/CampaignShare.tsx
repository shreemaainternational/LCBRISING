'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Heart, Target, Share2 } from 'lucide-react';
import { formatINR, formatINRShort, formatDate } from '@/lib/utils';
import { ShareTargets } from './ShareButton';

export type CampaignLite = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  goal_amount: number;
  ends_at: string | null;
  hero_image: string | null;
  urgency: string | null;
  impact_metric: string | null;
  category: string | null;
  match_campaign: boolean;
};

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

/** The grid card — opens a details+share modal instead of navigating away. */
export function CampaignCardModal({ campaign, raised }: { campaign: CampaignLite; raised: number }) {
  const [open, setOpen] = useState(false);
  const pct = campaign.goal_amount > 0 ? Math.min(100, (raised / campaign.goal_amount) * 100) : 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group text-left block w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.hero_image || FALLBACK_HERO} alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          {campaign.urgency === 'urgent' && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">Urgent</span>
          )}
          {campaign.match_campaign && (
            <span className="absolute top-3 right-3 bg-brand-500 text-navy-900 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">Donation matched</span>
          )}
        </div>
        <div className="p-5">
          {campaign.category && <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-600">{campaign.category}</p>}
          <h3 className="mt-1 font-bold text-lg text-navy-800 group-hover:text-brand-600 line-clamp-2">{campaign.title}</h3>
          {(campaign.tagline ?? campaign.description) && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{campaign.tagline ?? campaign.description}</p>
          )}
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-gray-700">
              <span>{formatINRShort(raised)} raised</span>
              <span className="text-gray-500">of {formatINRShort(Number(campaign.goal_amount))}</span>
            </div>
            <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 group-hover:text-brand-600">
            View &amp; share <Share2 size={13} />
          </span>
        </div>
      </button>
      {open && <CampaignModal campaign={campaign} raised={raised} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A standalone Share button (e.g. for the featured campaign). */
export function ShareCampaignButton({ campaign, raised }: { campaign: CampaignLite; raised: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="btn-navy inline-flex h-12 px-6 rounded-md items-center gap-2">
        <Share2 size={16} /> Share
      </button>
      {open && <CampaignModal campaign={campaign} raised={raised} onClose={() => setOpen(false)} />}
    </>
  );
}

function CampaignModal({ campaign, raised, onClose }: { campaign: CampaignLite; raised: number; onClose: () => void }) {
  const pct = campaign.goal_amount > 0 ? Math.min(100, (raised / campaign.goal_amount) * 100) : 0;
  const shareText = `Support "${campaign.title}" — ${campaign.tagline ?? campaign.description ?? 'a Lions Club Baroda Rising Star campaign'}`;
  // Share the per-campaign page — it carries Open Graph / Twitter Card meta so
  // social platforms render the campaign's image and full report preview.
  const shareUrl = `/campaigns/${campaign.slug}`;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[16/9] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.hero_image || FALLBACK_HERO} alt={campaign.title} className="w-full h-full object-cover" />
          <button type="button" onClick={onClose} aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow">
            <X size={16} />
          </button>
          {campaign.category && (
            <span className="absolute bottom-3 left-4 bg-brand-500 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">{campaign.category}</span>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-2xl font-bold text-navy-900">{campaign.title}</h3>
          {(campaign.description ?? campaign.tagline) && (
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{campaign.description ?? campaign.tagline}</p>
          )}

          <div className="mt-4">
            <div className="flex justify-between text-sm font-semibold text-navy-900">
              <span>{formatINR(raised)} raised</span>
              <span className="text-gray-500">of {formatINR(Number(campaign.goal_amount))}</span>
            </div>
            <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              {campaign.impact_metric ? (
                <span className="inline-flex items-center gap-1 text-brand-700 font-semibold"><Target size={12} /> {campaign.impact_metric}</span>
              ) : <span />}
              {campaign.ends_at && <span>Closes {formatDate(campaign.ends_at)}</span>}
            </div>
          </div>

          {/* Share */}
          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Share this campaign</p>
            <ShareTargets title={campaign.title} text={shareText} url={shareUrl} />
          </div>

          <div className="mt-5 flex gap-3">
            <Link href={`/donate?campaign=${campaign.slug}`} className="btn-gold inline-flex h-12 px-6 rounded-md items-center flex-1 justify-center">
              <Heart size={16} className="mr-1" /> Donate now
            </Link>
            <button type="button" onClick={onClose} className="px-4 h-12 rounded-md border text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
