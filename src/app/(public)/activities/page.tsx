import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { CAUSES } from '@/lib/causes';
import { getAllPublicEvents } from '@/lib/events';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Service Activities',
  description:
    'The eight global cause areas Lions Club of Baroda Rising Star serves, as identified by Lions Clubs International.',
  alternates: { canonical: '/activities' },
};

const EVENT_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=70',
];

export default async function ActivitiesPage() {
  const events = await getAllPublicEvents();

  return (
    <>
      <PageHero
        pillText="Lions International Global Causes"
        headline="Our Service Activities"
        subtitle="Lions Club of Baroda Rising Star serves the community through these 8 global cause areas identified by Lions Clubs International. Select a cause to see its activities and photos."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {/* Cause cards — each links to that cause's activities */}
      <section className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-7">
          {CAUSES.map((c) => (
            <article
              key={c.slug}
              id={c.slug}
              className="scroll-mt-28 flex flex-col bg-white border border-gray-200 rounded-2xl p-8 target:ring-2 target:ring-brand-400"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center">
                  <c.icon size={24} className="text-navy-700" aria-hidden />
                </div>
                <h2 className="text-2xl font-bold text-navy-800 pt-1.5">
                  {c.title}
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-5">{c.body}</p>
              <ul className="space-y-2 mb-6">
                {c.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0"
                      aria-hidden
                    />
                    <span className="text-navy-800">{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/activities/${c.slug}`}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
              >
                View {c.title} activities
                <ArrowRight size={15} aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Events — public events with their posters/photos */}
      {events.length > 0 && (
        <section id="events" className="scroll-mt-28 bg-gray-50 border-t border-gray-200 py-16 md:py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  Events
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-navy-800">
                  Installations, Meetings &amp; Celebrations
                </h2>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
              >
                View all events
                <ArrowRight size={15} aria-hidden />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {events.map((e, i) => {
                const image = e.cover_url || EVENT_FALLBACK_IMAGES[i % EVENT_FALLBACK_IMAGES.length];
                return (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={e.title}
                      loading="lazy"
                      className="h-48 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="p-6 flex flex-col flex-1">
                      <div className="text-xs text-brand-600 font-medium mb-1.5 flex items-center gap-1.5">
                        <Calendar size={13} aria-hidden />
                        {formatDate(e.date)}
                      </div>
                      <h3 className="font-bold text-lg text-navy-800 mb-2">{e.title}</h3>
                      {e.description && (
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{e.description}</p>
                      )}
                      {e.location && (
                        <div className="mt-auto text-xs text-gray-500 flex items-center gap-1.5">
                          <MapPin size={13} className="text-brand-500 flex-shrink-0" aria-hidden />
                          <span>{e.location}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Get involved CTA */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-4">
            Want to Get Involved?
          </h2>
          <p className="text-gray-600 mb-8">
            We are always looking for dedicated volunteers to help deliver our
            programs. No experience necessary — just a willingness to serve.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="btn-navy inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Volunteer With Us
            </Link>
            <Link
              href="/donate"
              className="btn-gold inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Support Our Programs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
