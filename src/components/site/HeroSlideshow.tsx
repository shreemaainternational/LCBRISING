'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Star, Heart, ArrowRight } from 'lucide-react';

export type HeroSlide = {
  pillText: string;
  headlineLines: [string, string];        // [white, gold]
  subtitle: string;
  bgImage: string;                         // public URL or /local path
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

/** Default slideshow content — kept in code so the homepage works
 *  even before any DB is wired. Replace `bgImage` URLs with your own
 *  uploads in /public/hero or Cloudinary URLs whenever ready. */
export const DEFAULT_SLIDES: HeroSlide[] = [
  {
    pillText: 'Serving Since 2024 · District 3232',
    headlineLines: ['Fighting Hunger,', 'Saving Lives'],
    subtitle:
      'No one should go hungry. Our food programs serve thousands of meals through community kitchens and food drives.',
    bgImage:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920&q=80&auto=format&fit=crop',
    primaryCta: { href: '/donate', label: 'Donate Now' },
    secondaryCta: { href: '/activities', label: 'Our Service Activities' },
  },
  {
    pillText: 'Serving Since 2024 · District 3232',
    headlineLines: ['We Are Serving a', 'World in Need'],
    subtitle:
      'One act of kindness at a time. Empowering communities through service, compassion, and collective action.',
    bgImage:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1920&q=80&auto=format&fit=crop',
    primaryCta: { href: '/donate', label: 'Donate Now' },
    secondaryCta: { href: '/activities', label: 'Our Service Activities' },
  },
  {
    pillText: 'Serving Since 2024 · District 3232',
    headlineLines: ['Together We', 'Make a Difference'],
    subtitle:
      'Lions Club of Baroda Rising Star is dedicated to serving our community through humanitarian projects, healthcare initiatives, and educational programs.',
    bgImage:
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1920&q=80&auto=format&fit=crop',
    primaryCta: { href: '/donate', label: 'Donate Now' },
    secondaryCta: { href: '/activities', label: 'Our Service Activities' },
  },
  {
    pillText: 'Serving Since 2024 · District 3232',
    headlineLines: ['Healthcare for', 'Everyone'],
    subtitle:
      'Free eye-camps, diabetes screening, paediatric cancer support, and disaster relief — wherever the need calls.',
    bgImage:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&q=80&auto=format&fit=crop',
    primaryCta: { href: '/donate', label: 'Donate Now' },
    secondaryCta: { href: '/activities', label: 'Our Service Activities' },
  },
];

export function HeroSlideshow({
  slides = DEFAULT_SLIDES,
  intervalMs = 6000,
}: {
  slides?: HeroSlide[];
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, slides.length, intervalMs]);

  return (
    <section
      className="relative overflow-hidden text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Service highlights"
    >
      {/* Stacked slides — cross-fade by opacity */}
      <div className="relative h-[600px] md:h-[680px]">
        {slides.map((s, i) => (
          <div
            key={i}
            aria-hidden={active !== i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              active === i ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(15,23,42,0.65), rgba(15,23,42,0.85)), url(${s.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="container-page h-full flex items-center justify-center">
              <div className="text-center max-w-4xl">
                {/* Pill */}
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 mb-6 text-sm">
                  <Star size={14} className="text-brand-400 fill-brand-400" aria-hidden />
                  <span className="text-white/90">{s.pillText}</span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-7xl font-bold leading-[1.05] mb-6">
                  <span className="block">{s.headlineLines[0]}</span>
                  <span className="block text-brand-400">{s.headlineLines[1]}</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto mb-8">
                  {s.subtitle}
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {s.primaryCta && (
                    <Link
                      href={s.primaryCta.href}
                      className="btn-gold inline-flex items-center gap-2 rounded-md px-6 py-3"
                    >
                      {s.primaryCta.label}
                      <Heart size={16} aria-hidden />
                    </Link>
                  )}
                  {s.secondaryCta && (
                    <Link
                      href={s.secondaryCta.href}
                      className="inline-flex items-center gap-2 rounded-md border border-white/40 hover:bg-white/10 text-white font-medium px-6 py-3 transition-colors"
                    >
                      {s.secondaryCta.label}
                      <ArrowRight size={16} aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dot navigation */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={active === i}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              active === i
                ? 'w-8 bg-brand-400'
                : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
