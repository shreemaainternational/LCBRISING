import type { Metadata } from 'next';
import { Camera } from 'lucide-react';
import { MediaExplorer, type MediaItem } from '@/components/site/MediaExplorer';

export const metadata: Metadata = {
  title: 'Media',
  description:
    'News articles, TV features, and online coverage of Lions Club Baroda Rising Star service activities.',
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
      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="container-page py-20 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-6">
            <Camera size={14} className="text-brand-400" aria-hidden />
            <span className="text-xs font-semibold tracking-[0.15em] text-brand-400">
              MEDIA
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
            Media Coverage
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
            News articles, TV features, and online coverage of our service
            activities and community impact.
          </p>
        </div>
      </section>

      <MediaExplorer items={COVERAGE} />
    </>
  );
}
