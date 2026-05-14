import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const FOUNDING_YEAR = 2020;

const TAGS = [
  'Community Service',
  'Healthcare',
  'Education',
  'Environment',
];

const COLLAGE = [
  // Top-left (large) — children sitting
  {
    src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80&auto=format&fit=crop',
    alt: 'Children sitting together at a community programme',
    cls: 'aspect-[4/3]',
  },
  // Top-right — group at sunset
  {
    src: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=900&q=80&auto=format&fit=crop',
    alt: 'Volunteers watching the sunset together',
    cls: 'aspect-[4/3]',
  },
  // Bottom-left — child portrait
  {
    src: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=900&q=80&auto=format&fit=crop',
    alt: 'Child smiling at the camera',
    cls: 'aspect-[4/3]',
  },
  // Bottom-right — hands together with paint
  {
    src: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=900&q=80&auto=format&fit=crop',
    alt: 'Hands joined together in solidarity',
    cls: 'aspect-[4/3]',
  },
];

export function AboutSection() {
  const yearsOfService = 3;

  return (
    <section className="container-page py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — copy */}
        <div>
          <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold mb-5">
            About Us
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-navy-800 leading-tight mb-6">
            Dedicated to Service{' '}
            <span className="text-brand-500">Since {FOUNDING_YEAR}</span>
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Lions Club of Baroda Rising Star is part of the world&apos;s largest
            service club organisation. We are men and women who volunteer our
            time to humanitarian causes in our local and world communities.
          </p>
          <p className="text-gray-700 leading-relaxed mb-8">
            Our club has been actively serving the Vadodara community through
            various projects in healthcare, education, environment, and
            community development.
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
            {TAGS.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {t}
              </li>
            ))}
          </ul>

          <Link
            href="/about"
            className="btn-navy inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm"
          >
            Learn More About Us
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>

        {/* Right — 2x2 collage with years badge */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            {COLLAGE.map((img, i) => (
              <figure
                key={i}
                className={`relative overflow-hidden rounded-2xl shadow-md bg-gray-200 ${img.cls}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>

          {/* Floating years badge */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-navy-900 rounded-2xl px-7 py-5 text-center shadow-2xl ring-4 ring-white"
            aria-label={`${yearsOfService}+ years of service`}
          >
            <div className="text-3xl md:text-4xl font-bold leading-none">
              {yearsOfService}+
            </div>
            <div className="text-xs md:text-sm font-semibold mt-1">
              Years of Service
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
