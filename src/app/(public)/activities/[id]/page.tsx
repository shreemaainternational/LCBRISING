import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Users, Calendar, Clock, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { ShareButton } from '@/components/site/ShareButton';
import { formatDate, formatINRShort } from '@/lib/utils';

export const revalidate = 300;

type Activity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  beneficiaries: number | null;
  service_hours: number | null;
  amount_raised: number | null;
  date: string;
  location: string | null;
  photos: string[] | null;
};

async function loadActivity(id: string): Promise<Activity | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select('id, title, description, category, beneficiaries, service_hours, amount_raised, date, location, photos')
      .eq('id', id)
      .maybeSingle();
    return (data as Activity) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await loadActivity(id);
  if (!a) return { title: 'Activity' };
  const cover = a.photos?.find(Boolean);
  const bits = [
    `${a.beneficiaries ?? 0} beneficiaries`,
    a.location ? `at ${a.location}` : '',
    a.date ? `on ${formatDate(a.date)}` : '',
  ].filter(Boolean).join(' ');
  const description = a.description
    ? `${a.description} (${bits})`
    : `A service activity by Lions Club Baroda Rising Star — ${bits}.`;
  const url = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/activities/${a.id}`;
  return {
    title: a.title,
    description,
    alternates: { canonical: `/activities/${a.id}` },
    openGraph: {
      title: a.title, description, url, type: 'article',
      images: cover ? [{ url: cover, width: 1200, height: 630, alt: a.title }] : undefined,
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title: a.title, description, images: cover ? [cover] : undefined },
  };
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await loadActivity(id);
  if (!a) notFound();
  const cover = a.photos?.find(Boolean);
  const gallery = (a.photos ?? []).filter(Boolean);

  return (
    <section className="bg-white py-10">
      <div className="container-page max-w-3xl">
        <Link href="/activities" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800 mb-5">
          <ArrowLeft size={14} /> All activities
        </Link>

        {cover && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={a.title} className="w-full h-full object-cover" />
            {a.category && (
              <span className="absolute top-4 left-4 bg-brand-500 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">{a.category.replace(/_/g, ' ')}</span>
            )}
          </div>
        )}

        <div className="mt-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-brand-600 font-semibold inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(a.date)}</div>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold text-navy-900">{a.title}</h1>
          </div>
          <ShareButton title={a.title} text={a.description ?? a.title} url={`/activities/${a.id}`} image={cover} variant="button" />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1"><Users size={14} /> {a.beneficiaries ?? 0} beneficiaries</span>
          <span className="inline-flex items-center gap-1"><MapPin size={14} /> {a.location ?? 'Vadodara'}</span>
          {Number(a.service_hours) > 0 && <span className="inline-flex items-center gap-1"><Clock size={14} /> {a.service_hours} service hours</span>}
          {Number(a.amount_raised) > 0 && <span className="inline-flex items-center gap-1"><Banknote size={14} /> ₹{formatINRShort(Number(a.amount_raised))} raised</span>}
        </div>

        {a.description && <p className="mt-5 text-gray-700 leading-relaxed whitespace-pre-wrap">{a.description}</p>}

        {gallery.length > 1 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.slice(1).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" className="aspect-square object-cover rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
