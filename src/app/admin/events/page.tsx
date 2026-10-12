import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { eventsPreset } from '@/components/admin/quick-add-presets';
import { EventsTable } from '@/components/admin/EventsTable';
import { Calendar } from 'lucide-react';
import { getEventCategoryGroup, groupCategorySlugs } from '@/lib/event-categories';

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
            <EventsTable events={events} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
