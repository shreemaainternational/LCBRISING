import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';

/**
 * Full-width navy band with a strong donate CTA. Sits between
 * social-proof sections (testimonials/featured) and the recent
 * activities grid as the primary conversion moment on the homepage.
 */
export function DonateCTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(251,191,36,0.35), transparent 40%), radial-gradient(circle at 85% 80%, rgba(251,191,36,0.25), transparent 50%)',
        }}
      />
      <div className="container-page relative py-16 md:py-20 grid md:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <span className="inline-block bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            Make an Impact Today
          </span>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-3">
            Your contribution{' '}
            <span className="text-brand-400">changes lives</span>
          </h2>
          <p className="text-gray-200 max-w-2xl">
            Every rupee funds eye camps, food drives, scholarships, and
            disaster relief. Donate online via Razorpay, UPI, or PhonePe —
            secure, instant receipt by email.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/donate"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 text-navy-900 font-semibold px-6 py-3 text-sm transition-colors shadow-md"
          >
            Donate Now
            <Heart size={16} aria-hidden />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 hover:bg-white/10 text-white font-medium px-6 py-3 text-sm transition-colors"
          >
            Become a Member
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
