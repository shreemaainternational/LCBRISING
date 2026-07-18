import type { Metadata } from 'next';
import { ProgrammeActivitiesPage } from '@/components/site/ProgrammeActivitiesPage';

export const metadata: Metadata = {
  title: 'Meetings',
  alternates: { canonical: '/meetings' },
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <ProgrammeActivitiesPage groupKey="meeting" initialCategory={category ?? ''} />
  );
}
