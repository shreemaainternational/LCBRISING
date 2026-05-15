import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';

export const dynamic = 'force-dynamic';

export default async function AdminActivitiesPage() {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from('activities').select('*').order('date', { ascending: false }).limit(200);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Activities</h1>
          <p className="text-gray-600">Service projects and reporting.</p>
        </div>
        <QuickAddCard
          title="Service Activity"
          endpoint="/api/activities"
          accent="blue"
          description="Log a service project. Photos, GPS, before/after media and CSR partner can be added afterwards."
          responseKey="activity"
          fields={[
            { name: 'title', label: 'Project Title', type: 'text', required: true, placeholder: 'Eye Camp at SSG Hospital' },
            { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
            { name: 'category', label: 'Service Category', type: 'select', defaultValue: 'healthcare', options: [
              { value: 'vision', label: 'Vision' },
              { value: 'hunger', label: 'Hunger Relief' },
              { value: 'environment', label: 'Environment' },
              { value: 'diabetes', label: 'Diabetes Awareness' },
              { value: 'childhood_cancer', label: 'Childhood Cancer' },
              { value: 'humanitarian', label: 'Humanitarian' },
              { value: 'youth', label: 'Youth Development' },
              { value: 'education', label: 'Education' },
              { value: 'healthcare', label: 'Healthcare' },
              { value: 'women', label: 'Women Empowerment' },
              { value: 'senior', label: 'Senior Citizens' },
              { value: 'other', label: 'Other' },
            ] },
            { name: 'beneficiaries', label: 'Beneficiaries', type: 'number', min: 0, defaultValue: 0, cast: 'int' },
            { name: 'service_hours', label: 'Service Hours', type: 'number', min: 0, defaultValue: 0, cast: 'number', step: 0.5 },
            { name: 'amount_raised', label: 'Funds Raised (₹)', type: 'number', min: 0, defaultValue: 0, cast: 'number' },
            { name: 'location', label: 'Location', type: 'text', placeholder: 'Venue or city' },
            { name: 'description', label: 'Description', type: 'textarea' },
          ]}
        />
      </div>
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
