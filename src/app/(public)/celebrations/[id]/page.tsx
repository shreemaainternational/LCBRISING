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
  const item = await getProgrammeItemById('CELEBRATION', id);
  if (!item) return { title: 'Celebration not found' };
  return { title: item.title, alternates: { canonical: `/celebrations/${id}` } };
}

export default async function CelebrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getProgrammeItemById('CELEBRATION', id);
  if (!item) notFound();
  return <MasterItemDetail item={item} />;
}
