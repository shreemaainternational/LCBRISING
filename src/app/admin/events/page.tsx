import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { eventsPreset } from '@/components/admin/quick-add-presets';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  await requireAdminPage();
  // Service-role read: the events select policy sub-selects members, which
  // trips RLS recursion under the user session on DBs missing migration 0059.
  const supabase = createAdminClient();
  const { data: events } = await supabase.from('events').select('*').order('date', { ascending: false });
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
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-right p-3">Capacity</th>
                  <th className="text-left p-3">Public</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-medium">{e.title}</td>
                    <td className="p-3">{formatDate(e.date, { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3">{e.location ?? '—'}</td>
                    <td className="p-3 text-right">{e.capacity ?? '—'}</td>
                    <td className="p-3">{e.is_public ? 'Yes' : 'No'}</td>
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
