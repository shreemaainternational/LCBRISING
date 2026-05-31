import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Human Stories',
  description:
    'Real lives, real change. Meet the children, families, and communities whose lives have been touched by the work of Lions Club Baroda Rising Star.',
  alternates: { canonical: '/stories' },
};
export const revalidate = 300;

type Story = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  beneficiary_name: string | null;
  beneficiary_age: number | null;
  location: string | null;
  hero_image: string | null;
  impact_quote: string | null;
  impact_metric: string | null;
  tags: string[] | null;
  is_featured: boolean | null;
  published_at: string | null;
};

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

const CURATED: Story[] = [
  {
    id: 'demo-arya',
    slug: '#',
    title: 'Arya can see the blackboard again',
    subtitle:
      'A free Lions eye-screening camp caught the cataract early — and gave a nine-year-old her classroom back.',
    beneficiary_name: 'Arya',
    beneficiary_age: 9,
    location: 'Vadodara, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“Now I can read my teacher’s notes from the back of the room.”',
    impact_metric: '1,240 children screened in 2025',
    tags: ['vision', 'children'],
    is_featured: true,
    published_at: '2025-09-10',
  },
  {
    id: 'demo-rekha',
    slug: '#',
    title: 'Rekha runs a tailoring business from her doorstep',
    subtitle:
      'A women’s livelihood programme turned one sewing machine into a steady income for her family of four.',
    beneficiary_name: 'Rekha',
    beneficiary_age: 34,
    location: 'Waghodia, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“My daughters do not have to miss school for tuition fees anymore.”',
    impact_metric: '86 women trained this year',
    tags: ['women', 'livelihood'],
    is_featured: false,
    published_at: '2025-06-22',
  },
  {
    id: 'demo-aakash',
    slug: '#',
    title: 'Aakash is back in school after the floods',
    subtitle:
      'A disaster-relief response delivered books, uniforms, and a temporary classroom in three weeks.',
    beneficiary_name: 'Aakash',
    beneficiary_age: 12,
    location: 'Padra, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“We lost everything except the will to study.”',
    impact_metric: '320 children returned to school',
    tags: ['relief', 'education'],
    is_featured: false,
    published_at: '2025-08-05',
  },
];

export default async function StoriesPage() {
  let stories: Story[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('stories')
        .select(
          'id, slug, title, subtitle, beneficiary_name, beneficiary_age, location, hero_image, impact_quote, impact_metric, tags, is_featured, published_at',
        )
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(24);
      stories = (data ?? []) as Story[];
    } catch {
      // stories table may not exist yet — curated stories still render
    }
  }

  const all = stories.length > 0 ? stories : CURATED;
  const featured = all.find((s) => s.is_featured) ?? all[0];
  const rest = all.filter((s) => s.id !== featured.id);

  return (
    <>
      <PageHero
        pillText="HUMAN STORIES"
        headline="Real lives. Real change."
        subtitle="Behind every statistic is a name, a face, and a story. Meet the people whose lives have been transformed by the work of Lions Baroda Rising Star."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {featured && <SpotlightStory story={featured} />}

      <section className="bg-white py-14">
        <div className="container-page">
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-8">More stories of impact</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {rest.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-navy-900 to-navy-800 text-white py-16">
        <div className="container-page text-center max-w-2xl mx-auto">
          <Heart className="mx-auto mb-4 text-brand-400" size={32} />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Help us write the next story.
          </h2>
          <p className="text-white/80 mb-6">
            Every donation funds a screening, a meal, a school bag, a future. Stand with us.
          </p>
          <Link
            href="/donate"
            className="inline-flex items-center justify-center h-12 px-7 rounded-md btn-gold"
          >
            Donate now
          </Link>
        </div>
      </section>
    </>
  );
}

function SpotlightStory({ story }: { story: Story }) {
  const href = story.slug && story.slug !== '#' ? `/stories/${story.slug}` : '/donate';
  return (
    <section className="bg-gray-50 py-14">
      <div className="container-page">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="relative aspect-[4/5] md:aspect-[4/5] rounded-3xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.hero_image || FALLBACK_HERO}
              alt={story.beneficiary_name ?? story.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand-300 font-semibold">
                Spotlight
              </div>
              {story.beneficiary_name && (
                <p className="mt-2 text-lg font-bold">
                  {story.beneficiary_name}
                  {story.beneficiary_age ? `, ${story.beneficiary_age}` : ''}
                </p>
              )}
              {story.location && (
                <p className="inline-flex items-center gap-1 text-sm text-white/80">
                  <MapPin size={12} /> {story.location}
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-navy-900 leading-tight">
              {story.title}
            </h2>
            {story.subtitle && (
              <p className="mt-5 text-lg text-gray-700 leading-relaxed">{story.subtitle}</p>
            )}
            {story.impact_quote && (
              <figure className="mt-7 border-l-4 border-brand-500 pl-5 italic text-navy-800 text-lg">
                {story.impact_quote}
              </figure>
            )}
            {story.impact_metric && (
              <div className="mt-7 inline-flex items-center gap-3 rounded-full bg-brand-50 text-brand-800 px-5 py-2 font-semibold text-sm">
                {story.impact_metric}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href} className="btn-navy inline-flex h-12 px-6 rounded-md items-center">
                Read full story
              </Link>
              <Link
                href="/donate"
                className="btn-gold inline-flex h-12 px-6 rounded-md items-center"
              >
                Support this work
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story }: { story: Story }) {
  const href = story.slug && story.slug !== '#' ? `/stories/${story.slug}` : '/donate';
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.hero_image || FALLBACK_HERO}
          alt={story.title}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
        />
        {story.beneficiary_name && (
          <span className="absolute top-3 left-3 bg-white/95 text-navy-900 text-xs font-semibold px-3 py-1 rounded-full">
            {story.beneficiary_name}
            {story.beneficiary_age ? `, ${story.beneficiary_age}` : ''}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-navy-800 group-hover:text-brand-600 line-clamp-2">
          {story.title}
        </h3>
        {story.subtitle && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{story.subtitle}</p>
        )}
        {story.impact_metric && (
          <p className="mt-3 text-xs font-semibold text-brand-700">{story.impact_metric}</p>
        )}
      </div>
    </Link>
  );
}
