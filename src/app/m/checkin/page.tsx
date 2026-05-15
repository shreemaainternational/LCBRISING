import { createAdminClient } from '@/lib/supabase/server';
import { CheckinScanner } from './CheckinScanner';

export const dynamic = 'force-dynamic';

export default async function MobileCheckin() {
  const { data: events } = await createAdminClient()
    .from('events')
    .select('id,title,date,location,qr_secret')
    .gte('date', new Date(Date.now() - 24 * 3600_000).toISOString())
    .order('date').limit(20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-800">QR Check-in</h1>
      <p className="text-sm text-gray-600">
        Show this code at the venue entrance or scan a member's pass to log attendance.
      </p>

      <CheckinScanner />

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Today's events</h2>
        <div className="space-y-2">
          {(events ?? []).map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {e.location && ` · ${e.location}`}
                  </div>
                </div>
                <a
                  href={`/api/qr/${e.id}/card`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold"
                >
                  QR card
                </a>
              </div>
            </div>
          ))}
          {!events?.length && (
            <div className="text-center text-sm text-gray-500 py-6 bg-white rounded-xl">
              No events around today
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
