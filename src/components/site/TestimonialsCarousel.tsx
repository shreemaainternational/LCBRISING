'use client';

import { useEffect, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The Eye Camp at Pratapnagar restored sight to two people in our family. The volunteers treated us with such dignity — we are forever grateful.',
    name: 'Heena Patel',
    role: 'Beneficiary, Karelibaug',
    initials: 'HP',
  },
  {
    quote:
      'Joining Lions Baroda Rising Star changed how I see service. From food drives to disaster relief, every project leaves a mark on someone\'s life.',
    name: 'Vikas Mehta',
    role: 'Member since 2022',
    initials: 'VM',
  },
  {
    quote:
      'As District Governor, I\'ve seen many clubs, but the energy of this club\'s monthly projects is unmatched. They show up every single time.',
    name: 'PMJF Lion Rajesh Shah',
    role: 'Past District Governor',
    initials: 'RS',
  },
  {
    quote:
      'My daughter received a scholarship through this club\'s education drive. Today she\'s studying engineering. We owe a lot to this family.',
    name: 'Sangita Desai',
    role: 'Parent · Vadodara',
    initials: 'SD',
  },
  {
    quote:
      'The community kitchen serves 300+ meals every week without fail. Volunteering here taught me what consistency in service means.',
    name: 'Tejas Joshi',
    role: 'Volunteer, Hunger Relief Team',
    initials: 'TJ',
  },
];

const ROTATE_MS = 7000;

export function TestimonialsCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % TESTIMONIALS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const t = TESTIMONIALS[idx];

  return (
    <section
      className="bg-white py-16 md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-page max-w-4xl mx-auto text-center">
        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          Voices
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-12">
          What our community says
        </h2>

        <div className="relative">
          <Quote
            size={48}
            className="absolute -top-4 left-4 md:left-12 text-brand-200 opacity-60"
            aria-hidden
          />
          <div
            key={idx}
            className="relative px-6 md:px-16 transition-opacity duration-500"
          >
            <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-8 italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center justify-center gap-3">
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-navy-900 font-bold ring-2 ring-brand-300"
              >
                {t.initials}
              </span>
              <div className="text-left">
                <div className="font-semibold text-navy-800">{t.name}</div>
                <div className="text-sm text-gray-500">{t.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() =>
              setIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-brand-100 text-navy-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show testimonial ${i + 1}`}
                aria-current={i === idx}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === idx ? 'w-8 bg-brand-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => setIdx((i) => (i + 1) % TESTIMONIALS.length)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-brand-100 text-navy-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
