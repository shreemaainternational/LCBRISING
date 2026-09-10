import type { Metadata } from 'next';
import { ProgrammeTypeListing } from '@/components/site/ProgrammeTypeListing';

export const metadata: Metadata = {
  title: 'International Days',
  alternates: { canonical: '/international-days' },
};

export default function InternationalDaysPage() {
  return (
    <ProgrammeTypeListing
      type="INTERNATIONAL_DAY"
      title="International Days"
      blurb="World Lions Day, United Nations Day and other international observance days."
    />
  );
}
