import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProgrammeItemById } from '@/lib/master-calendar';
import { MasterItemDetail } from '@/components/site/MasterItemDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getProgrammeItemById('INTERNATIONAL_DAY', id);
  if (!item) return { title: 'International Day not found' };
  return { title: item.title, alternates: { canonical: `/international-days/${id}` } };
}

export default async function InternationalDayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getProgrammeItemById('INTERNATIONAL_DAY', id);
  if (!item) notFound();
  return <MasterItemDetail item={item} />;
}
