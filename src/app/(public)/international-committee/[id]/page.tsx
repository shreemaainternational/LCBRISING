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
  const item = await getProgrammeItemById('INTERNATIONAL_COMMITTEE', id);
  if (!item) return { title: 'International Committee programme not found' };
  return { title: item.title, alternates: { canonical: `/international-committee/${id}` } };
}

export default async function InternationalCommitteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getProgrammeItemById('INTERNATIONAL_COMMITTEE', id);
  if (!item) notFound();
  return <MasterItemDetail item={item} />;
}
