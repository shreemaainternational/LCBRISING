import type { Metadata } from 'next';
import { ProgrammeTypeListing } from '@/components/site/ProgrammeTypeListing';

export const metadata: Metadata = {
  title: 'Celebrations',
  alternates: { canonical: '/celebrations' },
};

export default function CelebrationsPage() {
  return (
    <ProgrammeTypeListing
      type="CELEBRATION"
      title="Celebrations & Festivals"
      blurb="Nand Mahotsav, festivals and other club celebration days."
    />
  );
}
