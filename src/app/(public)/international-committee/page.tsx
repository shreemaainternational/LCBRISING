import type { Metadata } from 'next';
import { ProgrammeTypeListing } from '@/components/site/ProgrammeTypeListing';

export const metadata: Metadata = {
  title: 'International Committee',
  alternates: { canonical: '/international-committee' },
};

export default function InternationalCommitteePage() {
  return (
    <ProgrammeTypeListing
      type="INTERNATIONAL_COMMITTEE"
      title="International Committee"
      blurb="International relations, club twinning and international committee programmes."
    />
  );
}
