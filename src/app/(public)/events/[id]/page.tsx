import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPublicEventById } from '@/lib/events';
import { EventReport } from '@/components/site/EventReport';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description ?? `${event.title} — Lions Club of Baroda Rising Star`,
    alternates: { canonical: `/events/${event.id}` },
  };
}

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) notFound();

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
        >
          <ArrowLeft size={14} /> All events
        </Link>
      </div>
      <EventReport event={event} />
    </div>
  );
}
