import { Star } from 'lucide-react';

/**
 * Dark navy hero block with optional topical background image.
 * Used across all public pages so the visual tone stays consistent.
 *
 * When `backgroundImage` is supplied:
 *   - The image is rendered full-bleed behind the content
 *   - A navy-tinted gradient overlay keeps the white text readable
 *   - Existing radial decorations still layer on top for depth
 */
export function PageHero({
  pillText,
  headline,
  accent,
  subtitle,
  backgroundImage,
  children,
}: {
  pillText?: string;
  headline: string;
  accent?: string;
  subtitle?: string;
  backgroundImage?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white overflow-hidden">
      {backgroundImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-navy-900/70 via-navy-800/60 to-navy-900/80"
          />
        </>
      )}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.18), transparent 40%), radial-gradient(circle at 80% 60%, rgba(30,64,175,0.4), transparent 50%)',
        }}
      />
      <div className="container-page relative py-20 md:py-24 text-center">
        {pillText && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 mb-6 text-sm">
            <Star size={14} className="text-brand-400 fill-brand-400" aria-hidden />
            <span className="text-white/90">{pillText}</span>
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 max-w-4xl mx-auto drop-shadow-lg">
          <span>{headline}</span>
          {accent && (
            <>
              {' '}
              <span className="text-brand-400">{accent}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg text-gray-100 max-w-2xl mx-auto mb-8 drop-shadow">
            {subtitle}
          </p>
        )}
        {children && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Curated topical background images per public page.
 * All on Unsplash so they pass the next.config remotePatterns.
 */
export const PAGE_HERO_BG = {
  contact:    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=80&auto=format&fit=crop',  // people on phones / customer support
  about:      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1920&q=80&auto=format&fit=crop',  // volunteers in action
  donate:     'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1920&q=80&auto=format&fit=crop',  // helping hands
  portal:     'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1920&q=80&auto=format&fit=crop',  // collaboration / digital
  activities: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920&q=80&auto=format&fit=crop',  // service activity
  events:     'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80&auto=format&fit=crop',  // event crowd
  media:      'https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=1920&q=80&auto=format&fit=crop',  // photography
  blog:       'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1920&q=80&auto=format&fit=crop',  // writing
  terms:      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920&q=80&auto=format&fit=crop',  // documents
  privacy:    'https://images.unsplash.com/photo-1614064642639-e398cf05badb?w=1920&q=80&auto=format&fit=crop',  // security
} as const;
