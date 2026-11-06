import Link from 'next/link';
import { ArrowLeft, MapPin, Users, CalendarDays } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { formatDate } from '@/lib/utils';
import { STATUS_LABEL, MASTER_TYPE_LABEL, type MasterItem } from '@/lib/master-calendar';

/**
 * Shared full-page detail view for the master-calendar categories that
 * don't have their own bespoke detail page (Meeting, Leadership,
 * Celebration, International Day, International Committee). Service
 * Activities and Events keep their existing detail pages/modal.
 */
export function MasterItemDetail({ item }: { item: MasterItem }) {
  const statusLabel = item.status ? STATUS_LABEL[item.status] ?? item.status : 'Scheduled';

  return (
    <>
      <PageHero
        pillText={`LIONS CLUB OF BARODA RISING STAR · ${MASTER_TYPE_LABEL[item.type].toUpperCase()}`}
        headline={item.title}
        subtitle={[formatDate(item.date), item.venue].filter(Boolean).join(' · ')}
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="container-page py-14 md:py-16 max-w-3xl">
        <Link
          href="/activities"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600 mb-8"
        >
          <ArrowLeft size={15} aria-hidden /> Back to Activities &amp; Programmes
        </Link>

        {item.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {item.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} alt={item.title} className="w-full aspect-[4/3] object-cover rounded-xl" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="text-brand-500" aria-hidden />{formatDate(item.date)}</span>
          {item.venue && (
            <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-brand-500" aria-hidden />{item.venue}</span>
          )}
          {(item.beneficiaries ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-brand-500" aria-hidden />Beneficiaries: {item.beneficiaries!.toLocaleString('en-IN')}</span>
          )}
          {(item.participants ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-brand-500" aria-hidden />Capacity: {item.participants!.toLocaleString('en-IN')}</span>
          )}
          <span className="inline-flex items-center gap-1.5 font-semibold text-navy-800">{statusLabel}</span>
        </div>

        {item.description && (
          <div className="prose prose-navy max-w-none text-gray-700 whitespace-pre-line">{item.description}</div>
        )}
      </section>
    </>
  );
}
