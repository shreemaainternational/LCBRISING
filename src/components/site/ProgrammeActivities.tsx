'use client';

import { useMemo, useState } from 'react';
import {
  CauseActivities,
  type CauseActivity,
} from '@/app/(public)/activities/[cause]/CauseActivities';
import { CategoryTabs, type CategoryTab } from '@/components/site/CategoryTabs';

/**
 * Client wrapper for the Meetings / Leadership Programme pages: a tab bar
 * (mapped to the navigation sub-menu) that filters the group's activities
 * by category, rendered with the same gallery used on the cause pages.
 */
export function ProgrammeActivities({
  activities,
  tabs,
  initialCategory = '',
}: {
  activities: CauseActivity[];
  tabs: CategoryTab[];
  initialCategory?: string;
}) {
  const [active, setActive] = useState(initialCategory);

  const visible = useMemo(
    () =>
      active
        ? activities.filter((a) => a.category === active)
        : activities,
    [activities, active],
  );

  return (
    <div className="space-y-8">
      <CategoryTabs tabs={tabs} active={active} onChange={setActive} />
      {visible.length > 0 ? (
        <CauseActivities activities={visible} />
      ) : (
        <p className="text-center text-gray-500 py-8">
          No activities in this category yet. Check back soon!
        </p>
      )}
    </div>
  );
}
