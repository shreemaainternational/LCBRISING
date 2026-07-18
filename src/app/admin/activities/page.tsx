import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { BulkActivityUpload } from '@/components/admin/BulkActivityUpload';
import { activitiesPreset } from '@/components/admin/quick-add-presets';
import { activityCategoryLabel } from '@/lib/activity-categories';
import { Activity as ActivityIcon, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const selected = category ?? '';

  const supabase = await createClient();
  const [{ data: activities }, { data: clubs }] = await Promise.all([
    supabase.from('activities').select('*').order('date', { ascending: false }).limit(200),
    supabase.from('clubs').select('id, name').is('deleted_at', null).order('name'),
  ]);
  const preset = activitiesPreset();
  const clubOptions = clubs ?? [];
  const all = activities ?? [];

  // Categories present in the data, with counts, for the filter chips.
  const counts = new Map<string, number>();
  for (const a of all) {
    const slug = (a.category as string | null) ?? 'other';
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const categoryChips = Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, label: activityCategoryLabel(slug), count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const visible = selected ? all.filter((a) => ((a.category as string | null) ?? 'other') === selected) : all;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Activities</h1>
          <p className="text-gray-600">Service projects and reporting.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <BulkActivityUpload clubs={clubOptions} />
          <QuickAddCard title="Service Activity" {...preset} />
        </div>
      </div>

      {/* Category filter */}
      {categoryChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <FilterChip href="/admin/activities" label="All" count={all.length} active={!selected} />
          {categoryChips.map((c) => (
            <FilterChip
              key={c.slug}
              href={`/admin/activities?category=${c.slug}`}
              label={c.label}
              count={c.count}
              active={selected === c.slug}
            />
          ))}
        </div>
      )}

      {!all.length ? (
        <EmptyState
          icon={<ActivityIcon size={26} />}
          title="No activities yet"
          description="Log your first service project. Activities power the activity, beneficiary, financial and SDG reports."
          cta={<QuickAddCard title="Service Activity" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {visible.length} {visible.length === 1 ? 'activity' : 'activities'}
              {selected && <span className="text-gray-500 font-normal"> · {activityCategoryLabel(selected)}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visible.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">
                No {activityCategoryLabel(selected).toLowerCase()} activities.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Beneficiaries</th>
                    <th className="text-right p-3">Hours</th>
                    <th className="text-right p-3">Raised</th>
                    <th className="text-right p-3">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        <Link href={`/admin/activities/${a.id}`} className="text-navy-800 hover:underline">
                          {a.title}
                        </Link>
                      </td>
                      <td className="p-3">{a.category ? activityCategoryLabel(a.category) : '—'}</td>
                      <td className="p-3">{formatDate(a.date)}</td>
                      <td className="p-3 text-right">{a.beneficiaries}</td>
                      <td className="p-3 text-right">{Number(a.service_hours)}</td>
                      <td className="p-3 text-right">{Number(a.amount_raised)}</td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/activities/${a.id}/edit`}
                          className="inline-flex items-center gap-1 text-navy-700 hover:text-blue-800 hover:underline"
                          aria-label={`Edit ${a.title}`}
                        >
                          <Pencil size={13} /> Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
        active
          ? 'bg-navy-800 border-navy-800 text-white'
          : 'bg-white border-gray-200 text-navy-700 hover:border-brand-400 hover:text-brand-600'
      }`}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-gray-400'}>{count}</span>
    </Link>
  );
}
