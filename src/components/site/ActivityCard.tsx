import { Calendar, MapPin, Users, Clock, HeartHandshake, Images, ImageOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export type ActivityCardData = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  lionMembers: number | null;
  serviceHours: number | null;
  photos: string[];
  captions?: Record<string, string>;
};

/**
 * Shared activity card used everywhere activities are listed on the public
 * site (homepage recent activities, cause pages, programme pages) so the
 * feed reads as one consistent design instead of several one-off layouts.
 */
export function ActivityCard({
  activity,
  onOpen,
}: {
  activity: ActivityCardData;
  onOpen: () => void;
}) {
  const cover = activity.photos[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View details for ${activity.title}`}
      className="group text-left flex flex-col h-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <div className="relative block aspect-[16/10] bg-gray-100 overflow-hidden">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={activity.captions?.[cover] || activity.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            {activity.photos.length > 1 && (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">
                <Images size={12} aria-hidden /> {activity.photos.length}
              </span>
            )}
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-300">
            <ImageOff size={30} aria-hidden />
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-bold text-navy-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {activity.title}
        </h3>
        {activity.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{activity.description}</p>
        )}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Calendar size={13} aria-hidden /> {formatDate(activity.date)}
          </span>
          {activity.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} aria-hidden /> {activity.location}
            </span>
          )}
          {!!activity.beneficiaries && activity.beneficiaries > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users size={13} aria-hidden /> {activity.beneficiaries.toLocaleString('en-IN')} reached
            </span>
          )}
          {!!activity.lionMembers && activity.lionMembers > 0 && (
            <span className="inline-flex items-center gap-1">
              <HeartHandshake size={13} aria-hidden /> {activity.lionMembers.toLocaleString('en-IN')} Lions
            </span>
          )}
          {!!activity.serviceHours && activity.serviceHours > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} aria-hidden /> {activity.serviceHours.toLocaleString('en-IN')} hrs
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
