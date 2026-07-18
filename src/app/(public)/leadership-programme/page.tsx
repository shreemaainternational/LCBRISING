import type { Metadata } from 'next';
import { ProgrammeActivitiesPage } from '@/components/site/ProgrammeActivitiesPage';

export const metadata: Metadata = {
  title: 'Leadership Programme',
  alternates: { canonical: '/leadership-programme' },
};

export default async function LeadershipProgrammePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <ProgrammeActivitiesPage
      groupKey="leadership"
      initialCategory={category ?? ''}
    />
  );
}
