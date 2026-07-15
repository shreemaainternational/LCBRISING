import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { activitiesPreset } from '@/components/admin/quick-add-presets';
import { Activity as ActivityIcon, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminActivitiesPage() {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from('activities').select('*').order('date', { ascending: false }).limit(200);
  const preset = activitiesPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Activities</h1>
          <p className="text-gray-600">Service projects and reporting.</p>
        </div>
        <QuickAddCard title="Service Activity" {...preset} />
      </div>

      {!activities?.length ? (
        <EmptyState
          icon={<ActivityIcon size={26} />}
          title="No activities yet"
          description="Log your first service project. Activities power the activity, beneficiary, financial and SDG reports."
          cta={<QuickAddCard title="Service Activity" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{activities.length} activities</CardTitle></CardHeader>
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
                  <th className="text-right p-3">Edit</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link href={`/admin/activities/${a.id}`} className="text-navy-800 hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="p-3">{a.category ?? '—'}</td>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
