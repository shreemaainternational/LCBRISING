import Link from 'next/link';
import { Heart } from 'lucide-react';

/**
 * Full-width navy band with a strong donate CTA. Centered layout —
 * gold heart, headline, supporting copy, and two action buttons.
 */
export function DonateCTABanner() {
  return (
    <section className="bg-navy-900 text-white border-t border-white/15">
      <div className="container-page py-20 md:py-24 text-center">
        <Heart
          size={44}
          strokeWidth={2.5}
          className="text-brand-400 mx-auto mb-6"
          aria-hidden
        />
        <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
          Every Rupee Makes a Difference
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-8">
          Your generous donations directly fund our community programs, feeding
          families, supporting education, and empowering lives.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/donate"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 text-navy-900 font-semibold px-6 py-3 text-sm transition-colors shadow-md"
          >
            Donate Now
            <Heart size={16} aria-hidden />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-md border border-white/40 hover:bg-white/10 text-white font-medium px-6 py-3 text-sm transition-colors"
          >
            Learn Our Story
          </Link>
        </div>
      </div>
    </section>
  );
}
