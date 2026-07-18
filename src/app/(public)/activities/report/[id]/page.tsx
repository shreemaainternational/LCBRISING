import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users, Clock, IndianRupee } from 'lucide-react';
import { getActivityReport } from '@/lib/activities';
import { getCause } from '@/lib/causes';
import { getEventCategory } from '@/lib/event-categories';
import { LocationMap } from '@/components/site/LocationMap';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function categoryLabel(slug: string | null): string {
  if (!slug) return 'Service Activity';
  return (
    getCause(slug)?.title ??
    getEventCategory(slug)?.label ??
    slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await getActivityReport(id);
  if (!a) return { title: 'Report not found' };
  return {
    title: a.title,
    description: a.description ?? `${a.title} — Lions Club of Baroda Rising Star`,
    alternates: { canonical: `/activities/report/${a.id}` },
  };
}

export default async function ActivityReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getActivityReport(id);
  if (!a) notFound();

  const cover = a.photos[0];
  const rest = a.photos.slice(1);

  return (
    <article className="pb-16">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={a.captions[cover] || a.title}
          className="w-full max-h-[520px] object-contain bg-navy-900"
        />
      )}

      <div className="container-page pt-8">
        <Link
          href="/activities"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800 mb-6"
        >
          <ArrowLeft size={14} /> All service activities
        </Link>

        <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {categoryLabel(a.category)}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-navy-800 mb-5">{a.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-8">
          <span className="inline-flex items-center gap-2">
            <Calendar size={15} className="text-brand-500" aria-hidden /> {formatDate(a.date)}
          </span>
          {a.location && (
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} className="text-brand-500" aria-hidden /> {a.location}
            </span>
          )}
          {!!a.beneficiaries && a.beneficiaries > 0 && (
            <span className="inline-flex items-center gap-2">
              <Users size={15} className="text-brand-500" aria-hidden />{' '}
              {a.beneficiaries.toLocaleString('en-IN')} beneficiaries
            </span>
          )}
          {!!a.service_hours && a.service_hours > 0 && (
            <span className="inline-flex items-center gap-2">
              <Clock size={15} className="text-brand-500" aria-hidden /> {a.service_hours} service hours
            </span>
          )}
          {!!a.amount_raised && a.amount_raised > 0 && (
            <span className="inline-flex items-center gap-2">
              <IndianRupee size={15} className="text-brand-500" aria-hidden />{' '}
              {a.amount_raised.toLocaleString('en-IN')} raised
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {a.description ? (
              <div className="prose prose-navy max-w-none whitespace-pre-line text-gray-700 leading-relaxed">
                {a.description}
              </div>
            ) : (
              <p className="text-gray-500">A full report for this activity will be shared soon.</p>
            )}
          </div>

          {a.location && (
            <aside className="lg:col-span-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-3">
                Location
              </h2>
              <LocationMap location={a.location} />
              <p className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                <MapPin size={15} className="text-brand-500 mt-0.5 flex-shrink-0" aria-hidden />
                {a.location}
              </p>
            </aside>
          )}
        </div>

        {/* Photo gallery */}
        {rest.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-5">
              Photos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {rest.map((url) => (
                <figure key={url} className="overflow-hidden rounded-xl border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={a.captions[url] || a.title}
                    loading="lazy"
                    className="w-full h-52 object-cover"
                  />
                  {a.captions[url] && (
                    <figcaption className="px-3 py-2 text-xs text-gray-600">
                      {a.captions[url]}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
