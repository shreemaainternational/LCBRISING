import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, MapPin, Clock, ChevronLeft } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MobileEventsPage() {
  const me = await getCurrentMember();
  if (!me) redirect('/login?redirectTo=/m/events');
  const db = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await db.from('events')
    .select('id, title, description, starts_at, location, category')
    .gte('starts_at', today).order('starts_at').limit(50);
  const { data: past } = await db.from('events')
    .select('id, title, starts_at, location')
    .lt('starts_at', today).order('starts_at', { ascending: false }).limit(10);

  const upRows = upcoming ?? [];
  const pastRows = past ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-2">
          <Link href="/m" className="text-gray-600 -ml-1 p-1">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-navy-900">Events</h1>
        </div>
      </header>

      <main className="p-4 space-y-5">
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Upcoming · {upRows.length}
          </h2>
          {!upRows.length ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500">
              No upcoming events scheduled.
            </div>
          ) : (
            <div className="space-y-2">
              {upRows.map((e) => <EventCard key={e.id} e={e} />)}
            </div>
          )}
        </section>

        {pastRows.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Recent
            </h2>
            <div className="space-y-2">
              {pastRows.map((e) => (
                <div key={e.id} className="bg-white rounded-xl p-3 text-sm opacity-70">
                  <div className="font-semibold text-navy-800">{e.title}</div>
                  <div className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {new Date(e.starts_at).toLocaleDateString('en-IN')}
                    {e.location && <> · <MapPin size={11} /> {e.location}</>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  location?: string | null;
  category?: string | null;
}

function EventCard({ e }: { e: EventRow }) {
  const d = new Date(e.starts_at);
  return (
    <article className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-700 flex flex-col items-center justify-center flex-shrink-0">
          <div className="text-[10px] font-bold uppercase">{d.toLocaleDateString('en-IN', { month: 'short' })}</div>
          <div className="text-lg font-extrabold leading-none">{d.getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-navy-800">{e.title}</div>
          {e.description && (
            <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{e.description}</div>
          )}
          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-0.5"><Clock size={10} />{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            {e.location && <span className="inline-flex items-center gap-0.5"><MapPin size={10} />{e.location}</span>}
            {e.category && <span className="text-[10px] uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded-full">{e.category}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
