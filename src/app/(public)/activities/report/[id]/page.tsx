import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActivityReport } from '@/lib/activities';
import { ActivityReport } from '@/components/site/ActivityReport';
import { formatDate } from '@/lib/utils';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Plain-text summary for social previews — trimmed, no markup, no invented facts. */
function socialDescription(a: { title: string; description: string | null; date: string; location: string | null }): string {
  if (a.description) {
    const oneLine = a.description.replace(/\s+/g, ' ').trim();
    return oneLine.length > 200 ? `${oneLine.slice(0, 197)}…` : oneLine;
  }
  const parts = [a.title, 'by Lions Club of Baroda Rising Star', `on ${formatDate(a.date)}`];
  if (a.location) parts.push(`at ${a.location}`);
  return `${parts.join(' ')}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await getActivityReport(id);
  if (!a) return { title: 'Report not found' };

  const title = `${a.title} | Lions Club of Baroda Rising Star`;
  const description = socialDescription(a);
  const url = `${env.NEXT_PUBLIC_SITE_URL}/activities/report/${a.id}`;
  const cover = a.photos[0];

  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: 'Lions Club Baroda Rising Star',
      images: cover
        ? [
            {
              url: cover,
              width: 1200,
              height: 630,
              alt: a.captions[cover] || `${a.title} — Lions Club of Baroda Rising Star`,
            },
          ]
        : undefined,
      publishedTime: a.date,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
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

  const url = `${env.NEXT_PUBLIC_SITE_URL}/activities/report/${a.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: socialDescription(a),
    datePublished: a.date,
    url,
    image: a.photos.length > 0 ? a.photos : undefined,
    author: { '@type': 'Organization', name: 'Lions Club of Baroda Rising Star' },
    publisher: { '@type': 'Organization', name: 'Lions Club of Baroda Rising Star' },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { position: 1, '@type': 'ListItem', name: 'Home', item: env.NEXT_PUBLIC_SITE_URL },
      { position: 2, '@type': 'ListItem', name: 'Activities', item: `${env.NEXT_PUBLIC_SITE_URL}/activities` },
      { position: 3, '@type': 'ListItem', name: a.title, item: url },
    ],
  };

  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-4xl px-5 sm:px-8 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-navy-800">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/activities" className="hover:text-navy-800">Activities</Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-navy-800 font-medium truncate max-w-[220px] sm:max-w-none" aria-current="page">
            {a.title}
          </li>
        </ol>
        <Link
          href="/activities"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
        >
          <ArrowLeft size={14} /> All service activities
        </Link>
      </nav>
      <ActivityReport activity={a} />
    </div>
  );
}
