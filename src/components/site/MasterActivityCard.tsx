import Link from 'next/link';
import {
  MapPin, Users, HeartHandshake, PartyPopper, Globe, Handshake,
  GraduationCap, CalendarDays,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { MASTER_TYPE_LABEL, STATUS_LABEL, type MasterItem, type MasterItemType } from '@/lib/master-calendar-shared';

export const TYPE_ICON: Record<MasterItemType, typeof Users> = {
  SERVICE_ACTIVITY: HeartHandshake,
  MEETING: Users,
  LEADERSHIP_PROGRAMME: GraduationCap,
  CELEBRATION: PartyPopper,
  INTERNATIONAL_DAY: Globe,
  INTERNATIONAL_COMMITTEE: Handshake,
  EVENT: CalendarDays,
};

const STATUS_DOT: Record<string, string> = {
  planned: 'bg-amber-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};

/** One card in the master timeline / category listing — a Service
 *  Activity, Meeting, Leadership Programme, Celebration, International
 *  Day, International Committee programme or Event — each clearly
 *  labelled with its category and linking to its own detail route. */
export function MasterActivityCard({ item }: { item: MasterItem }) {
  const Icon = TYPE_ICON[item.type];
  const dot = item.status ? STATUS_DOT[item.status] ?? 'bg-gray-400' : 'bg-gray-300';
  const statusLabel = item.status ? STATUS_LABEL[item.status] ?? item.status : 'Scheduled';
  return (
    <Link
      href={item.href}
      className="group flex flex-col bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500">{formatDate(item.date).toUpperCase()}</span>
        <Icon size={16} className="text-brand-500" aria-hidden />
      </div>
      <span className="inline-block w-fit text-[10px] font-bold tracking-wide text-navy-700 bg-blue-50 rounded-full px-2.5 py-1 mb-2">
        {MASTER_TYPE_LABEL[item.type].toUpperCase()}
      </span>
      <h3 className="font-bold text-navy-800 mb-3 line-clamp-2">{item.title}</h3>
      <div className="space-y-1.5 mb-3 text-sm text-gray-600">
        {item.venue && (
          <div className="flex items-center gap-1.5"><MapPin size={13} className="text-brand-500 flex-shrink-0" aria-hidden />{item.venue}</div>
        )}
        {item.beneficiaries !== null && item.beneficiaries > 0 && (
          <div className="flex items-center gap-1.5"><Users size={13} className="text-brand-500 flex-shrink-0" aria-hidden />Beneficiaries: {item.beneficiaries.toLocaleString('en-IN')}</div>
        )}
        {item.participants !== null && item.participants > 0 && (
          <div className="flex items-center gap-1.5"><Users size={13} className="text-brand-500 flex-shrink-0" aria-hidden />Capacity: {item.participants.toLocaleString('en-IN')}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        <span className="text-navy-800">{statusLabel.toUpperCase()}</span>
      </div>
      <span className="mt-auto inline-flex items-center justify-center rounded-md border border-navy-800 text-navy-800 group-hover:bg-navy-800 group-hover:text-white transition-colors text-xs font-semibold py-2">
        {item.ctaLabel.toUpperCase()}
      </span>
    </Link>
  );
}
