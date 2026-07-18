import type { Metadata } from 'next';
import { ProgrammeEventsPage } from '@/components/site/ProgrammeEventsPage';

export const metadata: Metadata = {
  title: 'Leadership Programme',
  alternates: { canonical: '/leadership-programme' },
};
export const revalidate = 60;

export default function LeadershipProgrammePage() {
  return <ProgrammeEventsPage groupKey="leadership" />;
}
