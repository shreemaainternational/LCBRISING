'use client';

/**
 * Horizontal, scrollable tab bar used to filter a list by category.
 * The first tab is always "All" (empty slug). Shared by the Meetings /
 * Leadership Programme activity pages and the Events page so the on-page
 * filters mirror the navigation menu exactly.
 */
export type CategoryTab = { slug: string; label: string };

export function CategoryTabs({
  tabs,
  active,
  onChange,
  allLabel = 'All',
}: {
  tabs: CategoryTab[];
  active: string;
  onChange: (slug: string) => void;
  allLabel?: string;
}) {
  const all: CategoryTab = { slug: '', label: allLabel };
  return (
    <div className="flex flex-wrap gap-2">
      {[all, ...tabs].map((t) => {
        const isActive = active === t.slug;
        return (
          <button
            key={t.slug || 'all'}
            type="button"
            onClick={() => onChange(t.slug)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-navy-800 border-navy-800 text-white'
                : 'bg-white border-gray-200 text-navy-700 hover:border-brand-400 hover:text-brand-600'
            }`}
            aria-pressed={isActive}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
