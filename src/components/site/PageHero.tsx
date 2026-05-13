import { Star } from 'lucide-react';

/**
 * Dark navy hero block matching the homepage reference design:
 *   pill (star icon + small text) → big headline (split with gold accent)
 *   → subtitle → optional children for CTAs.
 *
 * Drop this in at the top of any public page to keep the visual tone
 * consistent across the site.
 */
export function PageHero({
  pillText,
  headline,
  accent,
  subtitle,
  children,
}: {
  pillText?: string;
  headline: string;
  accent?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white overflow-hidden">
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
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 max-w-4xl mx-auto">
          <span>{headline}</span>
          {accent && (
            <>
              {' '}
              <span className="text-brand-400">{accent}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto mb-8">
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
