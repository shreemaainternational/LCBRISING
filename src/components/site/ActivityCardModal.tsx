'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Users, Share2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { ShareTargets } from './ShareButton';

export type ActivityLite = {
  id: string;
  title: string;
  description: string | null;
  beneficiaries: number | null;
  date: string;
  location: string | null;
  photos: string[] | null;
  category?: string | null;
};

export function ActivityCardModal({ activity }: { activity: ActivityLite }) {
  const [open, setOpen] = useState(false);
  const cover = activity.photos?.find(Boolean);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left w-full group">
        <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={activity.title} loading="lazy" className="h-44 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          )}
          <CardContent className="p-6">
            <div className="text-xs text-brand-600 font-medium mb-1">{formatDate(activity.date)}</div>
            <h3 className="font-semibold text-lg text-navy-800 mb-2 group-hover:text-brand-600">{activity.title}</h3>
            {activity.description && <p className="text-sm text-gray-600 line-clamp-3">{activity.description}</p>}
            <div className="text-xs text-gray-500 mt-4 flex items-center justify-between">
              <span>{activity.beneficiaries ?? 0} beneficiaries · {activity.location ?? 'Vadodara'}</span>
              <span className="inline-flex items-center gap-1 text-navy-700 group-hover:text-brand-600 font-semibold"><Share2 size={12} /> Share</span>
            </div>
          </CardContent>
        </Card>
      </button>
      {open && <ActivityModal activity={activity} onClose={() => setOpen(false)} />}
    </>
  );
}

function ActivityModal({ activity, onClose }: { activity: ActivityLite; onClose: () => void }) {
  const cover = activity.photos?.find(Boolean);
  const shareText = `${activity.title} — ${activity.beneficiaries ?? 0} beneficiaries served${activity.location ? ` at ${activity.location}` : ''} · Lions Club Baroda Rising Star`;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {cover && (
          <div className="relative aspect-[16/9] bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={activity.title} className="w-full h-full object-cover" />
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow"><X size={16} /></button>
          </div>
        )}
        <div className="p-5">
          {!cover && (
            <div className="flex justify-end -mt-1 mb-1">
              <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full border text-gray-500 hover:bg-gray-50 flex items-center justify-center"><X size={15} /></button>
            </div>
          )}
          <div className="text-xs text-brand-600 font-semibold inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(activity.date)}</div>
          <h3 className="mt-1 text-2xl font-bold text-navy-900">{activity.title}</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1"><Users size={13} /> {activity.beneficiaries ?? 0} beneficiaries</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {activity.location ?? 'Vadodara'}</span>
          </div>
          {activity.description && <p className="mt-3 text-sm text-gray-700 leading-relaxed">{activity.description}</p>}

          {activity.photos && activity.photos.length > 1 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {activity.photos.slice(1, 7).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="aspect-square object-cover rounded-md" />
              ))}
            </div>
          )}

          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Share this activity</p>
            <ShareTargets title={activity.title} text={shareText} url={`/activities/${activity.id}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
