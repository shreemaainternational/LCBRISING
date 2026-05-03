import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Activities',
  description: 'Service projects, events, and community work by Lions Club Baroda Rising Star.',
};
export const revalidate = 300;

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('date', { ascending: false })
    .limit(60);

  return (
    <section className="container-page py-16">
      <h1 className="text-4xl font-bold text-navy-800 mb-2">Activities</h1>
      <p className="text-gray-600 mb-10">Service projects organised by our chapter.</p>

      {(!activities || activities.length === 0) ? (
        <p className="text-gray-500">No activities posted yet — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{a.category ?? 'Service'}</Badge>
                  <span className="text-xs text-gray-500">{formatDate(a.date)}</span>
                </div>
                <h3 className="font-semibold text-lg text-navy-800 mb-2">{a.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-4">{a.description ?? ''}</p>
                <div className="text-xs text-gray-500 mt-4 flex items-center gap-3">
                  <span>{a.beneficiaries} beneficiaries</span>
                  <span>·</span>
                  <span>{Number(a.service_hours)} hrs</span>
                  {a.location && <><span>·</span><span>{a.location}</span></>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
