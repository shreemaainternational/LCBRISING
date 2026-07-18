import type { Metadata } from 'next';
import { ProgrammeEventsPage } from '@/components/site/ProgrammeEventsPage';

export const metadata: Metadata = {
  title: 'Meetings',
  alternates: { canonical: '/meetings' },
};
export const revalidate = 60;

export default function MeetingsPage() {
  return <ProgrammeEventsPage groupKey="meeting" />;
}
