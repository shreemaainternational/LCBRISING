import type { Metadata } from 'next';
import { MediaExplorer, type MediaItem } from '@/components/site/MediaExplorer';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Media',
  description:
    'News articles, TV features, and online coverage of Lions Club Baroda Rising Star service activities.',
  alternates: { canonical: '/media' },
};
export const revalidate = 300;

const COVERAGE: MediaItem[] = [
  {
    id: 'm-eye-camp',
    title: 'Lions Club Baroda Rising Star conducts free eye camp',
    outlet: 'Times of India',
    date: '15 January 2025',
    type: 'Newspaper',
    image:
      'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'm-wheelchairs',
    title: 'Lions Club donates wheelchairs to disabled persons',
    outlet: 'Gujarat Samachar',
    date: '20 February 2025',
    type: 'Online',
    image:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'm-blood-camp',
    title: 'Blood donation camp organized by Lions Club',
    outlet: 'VTV News',
    date: '10 March 2025',
    type: 'TV',
    image:
      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'm-tree-drive',
    title: 'Lions Club tree plantation drive covers 500 saplings',
    outlet: 'Divya Bhaskar',
    date: '22 April 2025',
    type: 'Newspaper',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'm-youth-program',
    title: 'Youth leadership program launched by Lions Club',
    outlet: 'Vadodara News',
    date: '15 May 2025',
    type: 'Online',
    image:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'm-food-packets',
    title: 'Lions Club distributes food packets to 500 families',
    outlet: 'Sandesh',
    date: '5 June 2025',
    type: 'Newspaper',
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70',
  },
];

export default function MediaPage() {
  return (
    <>
      <PageHero
        pillText="MEDIA"
        headline="Media Coverage"
        subtitle="News articles, TV features, and online coverage of our service activities and community impact."
        backgroundImage={PAGE_HERO_BG.media}
      />

      <MediaExplorer items={COVERAGE} />
    </>
  );
}
