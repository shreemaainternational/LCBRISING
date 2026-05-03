import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Events' };
export const revalidate = 60;

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: upcoming } = await supabase
    .from('events').select('*').eq('is_public', true).gte('date', now).order('date');
  const { data: past } = await supabase
    .from('events').select('*').eq('is_public', true).lt('date', now).order('date', { ascending: false }).limit(12);

  return (
    <section className="container-page py-16">
      <h1 className="text-4xl font-bold text-navy-800 mb-2">Events</h1>
      <p className="text-gray-600 mb-10">Join us at upcoming community events.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-4">Upcoming</h2>
      {(!upcoming || upcoming.length === 0) ? (
        <p className="text-gray-500 mb-10">No upcoming events scheduled.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {upcoming.map((e) => (
            <EventCard key={e.id} title={e.title} date={e.date} location={e.location} description={e.description} />
          ))}
        </div>
      )}

      {past && past.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mt-10 mb-4">Past Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {past.map((e) => (
              <EventCard key={e.id} title={e.title} date={e.date} location={e.location} description={e.description} muted />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function EventCard({
  title, date, location, description, muted,
}: {
  title: string; date: string; location: string | null; description: string | null; muted?: boolean;
}) {
  return (
    <Card className={muted ? 'opacity-80' : ''}>
      <CardContent className="p-6">
        <div className="text-xs text-brand-600 font-medium mb-1">
          {formatDate(date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
        <h3 className="font-semibold text-lg text-navy-800 mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600 line-clamp-3">{description}</p>}
        {location && <div className="text-xs text-gray-500 mt-3">{location}</div>}
      </CardContent>
    </Card>
  );
}
