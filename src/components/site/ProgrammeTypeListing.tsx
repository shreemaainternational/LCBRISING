import { getMasterCalendarItems, type MasterItemType } from '@/lib/master-calendar';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { MasterActivityCard } from '@/components/site/MasterActivityCard';

/** Listing page for a single master-calendar category (Celebrations,
 *  International Days, International Committee) — the same normalized
 *  data as the /activities master view, pre-filtered to one type. */
export async function ProgrammeTypeListing({
  type,
  title,
  blurb,
}: {
  type: MasterItemType;
  title: string;
  blurb?: string;
}) {
  const items = (await getMasterCalendarItems()).filter((i) => i.type === type);

  return (
    <>
      <PageHero
        pillText="LIONS CLUB OF BARODA RISING STAR"
        headline={title}
        subtitle={blurb}
        backgroundImage={PAGE_HERO_BG.activities}
      />
      <section className="container-page py-14 md:py-16">
        {items.length === 0 ? (
          <p className="text-center text-gray-500">
            No {title.toLowerCase()} have been published yet. Check back soon!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <MasterActivityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
