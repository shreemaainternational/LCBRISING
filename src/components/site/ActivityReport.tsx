import { Calendar, MapPin, Users, Clock, IndianRupee } from 'lucide-react';
import { activityCategoryLabel } from '@/lib/activity-categories';
import { LocationMap } from '@/components/site/LocationMap';
import { ShareButtons } from '@/components/site/ShareButtons';
import { formatDate } from '@/lib/utils';
import type { ActivityReport as ActivityReportData } from '@/lib/activities';

/** Full activity report body — shared by the report page and the modal. */
export function ActivityReport({ activity: a }: { activity: ActivityReportData }) {
  const cover = a.photos[0];
  const rest = a.photos.slice(1);

  return (
    <article>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={a.captions[cover] || a.title}
          className="w-full max-h-[460px] object-contain bg-navy-900"
        />
      )}

      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-7">
        <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {activityCategoryLabel(a.category)}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-navy-800 mb-5">{a.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-6">
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

        <ShareButtons title={a.title} className="mb-8" />

        <div className="grid lg:grid-cols-3 gap-8">
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

        {rest.length > 0 && (
          <section className="mt-10">
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
