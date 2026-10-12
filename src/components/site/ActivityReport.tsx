import { Calendar, MapPin, Users, Clock, IndianRupee, HeartHandshake, HandHeart } from 'lucide-react';
import { activityCategoryLabel } from '@/lib/activity-categories';
import { LocationMap } from '@/components/site/LocationMap';
import { ShareBar } from '@/components/site/ShareBar';
import { GalleryGrid } from '@/components/site/GalleryGrid';
import { formatDate } from '@/lib/utils';
import { env } from '@/lib/env';
import type { ActivityReport as ActivityReportData } from '@/lib/activities';

/** Full activity report body — shared by the report page and the modal. */
export function ActivityReport({ activity: a }: { activity: ActivityReportData }) {
  const cover = a.photos[0];
  const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}/activities/report/${a.id}`;
  const galleryPhotos = a.photos.map((url, i) => ({
    id: `${a.id}-${i}`,
    url,
    title: a.captions[url] || a.title,
    caption: a.captions[url] || null,
    date: a.date,
  }));

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
          {!!a.lion_members_count && a.lion_members_count > 0 && (
            <span className="inline-flex items-center gap-2">
              <HeartHandshake size={15} className="text-brand-500" aria-hidden />{' '}
              {a.lion_members_count.toLocaleString('en-IN')} Lion members
            </span>
          )}
          {!!a.leo_members_count && a.leo_members_count > 0 && (
            <span className="inline-flex items-center gap-2">
              <HandHeart size={15} className="text-brand-500" aria-hidden />{' '}
              {a.leo_members_count.toLocaleString('en-IN')} Leo members
            </span>
          )}
          {!!a.guest_count && a.guest_count > 0 && (
            <span className="inline-flex items-center gap-2">
              <Users size={15} className="text-brand-500" aria-hidden />{' '}
              {a.guest_count.toLocaleString('en-IN')} non-Lion guests
            </span>
          )}
        </div>

        {a.partner_organization && (
          <p className="text-sm text-gray-600 mb-6">
            In partnership with <span className="font-semibold text-navy-800">{a.partner_organization}</span>
          </p>
        )}

        <ShareBar url={canonicalUrl} title={a.title} className="mb-8" />

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

        {galleryPhotos.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-5">
              Photos
            </h2>
            <GalleryGrid photos={galleryPhotos} />
          </section>
        )}
      </div>
    </article>
  );
}
