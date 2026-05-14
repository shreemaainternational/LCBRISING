import { Star } from 'lucide-react';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The eye check-up camp gave my grandmother her sight back. The volunteers treated us like family — I will never forget their kindness.',
    name: 'Maria Johnson',
    role: 'Community Member',
  },
  {
    quote:
      'Serving with the Rising Star team has been the most rewarding part of my year. Every project leaves a real, lasting mark on Vadodara.',
    name: 'David Chen',
    role: 'Volunteer',
  },
  {
    quote:
      'I can see exactly where my contribution goes. The transparency and the impact reports make giving feel genuinely meaningful.',
    name: 'Sarah Williams',
    role: 'Donor',
  },
];

export function TestimonialsGrid() {
  return (
    <section className="bg-gray-50 py-20 md:py-24">
      <div className="container-page">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] text-brand-600">
            TESTIMONIALS
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-navy-800 mt-2">
            Voices of Impact
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-7 flex flex-col"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className="text-brand-500 fill-brand-500"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-gray-600 italic leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6">
                <div className="font-bold text-navy-800">{t.name}</div>
                <div className="text-sm text-gray-500">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
