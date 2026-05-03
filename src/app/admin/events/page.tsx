import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.from('events').select('*').order('date', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Events</h1>
      <p className="text-gray-600 mb-8">Manage upcoming and past events.</p>
      <Card>
        <CardHeader><CardTitle>{events?.length ?? 0} events</CardTitle></CardHeader>
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
              {(events ?? []).map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-medium">{e.title}</td>
                  <td className="p-3">{formatDate(e.date, { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-3">{e.location ?? '—'}</td>
                  <td className="p-3 text-right">{e.capacity ?? '—'}</td>
                  <td className="p-3">{e.is_public ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {(!events || events.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No events yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
