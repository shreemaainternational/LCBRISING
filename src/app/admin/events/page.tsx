import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { eventsPreset } from '@/components/admin/quick-add-presets';
import { DeleteEventButton } from '@/components/admin/DeleteEventButton';
import { Calendar, Pencil } from 'lucide-react';
import { getEventCategory, getEventCategoryGroup, groupCategorySlugs } from '@/lib/event-categories';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireAdminPage();
  // Service-role read: the events select policy sub-selects members, which
  // trips RLS recursion under the user session on DBs missing migration 0059.
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { group: groupKey } = await searchParams;
  const activeGroup = groupKey ? getEventCategoryGroup(groupKey) : undefined;

  let query = supabase.from('events').select('*').order('date', { ascending: false });
  if (activeGroup) query = query.in('category', groupCategorySlugs(activeGroup));
  const { data: events } = await query;
  const preset = eventsPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Events</h1>
          <p className="text-gray-600">Manage upcoming and past events.</p>
        </div>
        <QuickAddCard title="Event" {...preset} />
      </div>

      {!events?.length ? (
        <EmptyState
          icon={<Calendar size={26} />}
          title="No events yet"
          description="Create your first event below. A QR code is auto-issued so attendees can self check-in."
          cta={<QuickAddCard title="Event" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{events.length} events</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-right p-3">Capacity</th>
                  <th className="text-left p-3">Public</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-medium">{e.title}</td>
                    <td className="p-3">
                      {e.category
                        ? getEventCategory(e.category)?.label ?? e.category
                        : '—'}
                    </td>
                    <td className="p-3">{formatDate(e.date, { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3">{e.location ?? '—'}</td>
                    <td className="p-3 text-right">{e.capacity ?? '—'}</td>
                    <td className="p-3">{e.is_public ? 'Yes' : 'No'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/events/${e.id}/edit`}
                          className="inline-flex items-center gap-1 text-navy-700 hover:text-navy-900"
                        >
                          <Pencil size={14} /> Edit
                        </Link>
                        <DeleteEventButton id={e.id} title={e.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
