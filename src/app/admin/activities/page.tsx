import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminActivitiesPage() {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from('activities').select('*').order('date', { ascending: false }).limit(200);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Activities</h1>
      <p className="text-gray-600 mb-8">Service projects and reporting.</p>
      <Card>
        <CardHeader><CardTitle>{activities?.length ?? 0} activities</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Beneficiaries</th>
                <th className="text-right p-3">Hours</th>
                <th className="text-right p-3">Raised</th>
              </tr>
            </thead>
            <tbody>
              {(activities ?? []).map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-medium">{a.title}</td>
                  <td className="p-3">{a.category ?? '—'}</td>
                  <td className="p-3">{formatDate(a.date)}</td>
                  <td className="p-3 text-right">{a.beneficiaries}</td>
                  <td className="p-3 text-right">{Number(a.service_hours)}</td>
                  <td className="p-3 text-right">{Number(a.amount_raised)}</td>
                </tr>
              ))}
              {(!activities || activities.length === 0) && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No activities yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
