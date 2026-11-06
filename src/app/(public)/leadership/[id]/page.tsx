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
  const item = await getProgrammeItemById('LEADERSHIP_PROGRAMME', id);
  if (!item) return { title: 'Leadership Programme not found' };
  return { title: item.title, alternates: { canonical: `/leadership/${id}` } };
}

export default async function LeadershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getProgrammeItemById('LEADERSHIP_PROGRAMME', id);
  if (!item) notFound();
  return <MasterItemDetail item={item} />;
}
