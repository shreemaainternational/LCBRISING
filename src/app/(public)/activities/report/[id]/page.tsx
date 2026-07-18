import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActivityReport } from '@/lib/activities';
import { ActivityReport } from '@/components/site/ActivityReport';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-6">
        <Link
          href="/activities"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
        >
          <ArrowLeft size={14} /> All service activities
        </Link>
      </div>
      <ActivityReport activity={a} />
    </div>
  );
}
