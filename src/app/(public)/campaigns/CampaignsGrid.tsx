'use client';

import Link from 'next/link';
import { formatINRShort, formatDate } from '@/lib/utils';

export type CampaignCardData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  goal_amount: number;
  ends_at: string | null;
  hero_image: string | null;
  urgency: string | null;
  category: string | null;
  match_campaign: boolean;
  raised: number;
};

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

function pctOf(raised: number, goal: number) {
  return goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
}

export function CampaignsGrid({ campaigns }: { campaigns: CampaignCardData[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
      {campaigns.map((c) => {
        const pct = pctOf(c.raised, c.goal_amount);
        return (
          <Link
            key={c.id}
            href={`/campaigns/${c.slug}`}
            className="group text-left block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
              <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.hero_image || FALLBACK_HERO}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
                {c.urgency === 'urgent' && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                    Urgent
                  </span>
                )}
                {c.match_campaign && (
                  <span className="absolute top-3 right-3 bg-brand-500 text-navy-900 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                    Donation matched
                  </span>
                )}
              </div>
              <div className="p-5">
                {c.category && (
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-600">
                    {c.category}
                  </p>
                )}
                <h3 className="mt-1 font-bold text-lg text-navy-800 group-hover:text-brand-600 line-clamp-2">
                  {c.title}
                </h3>
                {(c.tagline ?? c.description) && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {c.tagline ?? c.description}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>{formatINRShort(c.raised)} raised</span>
                    <span className="text-gray-500">of {formatINRShort(Number(c.goal_amount))}</span>
                  </div>
                  <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {c.ends_at && (
                    <p className="mt-2 text-[11px] text-gray-500">Closes {formatDate(c.ends_at)}</p>
                  )}
                </div>
              </div>
          </Link>
        );
      })}
    </div>
  );
}
