import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { MapPin, AlertTriangle } from 'lucide-react';
import { ClubMap, type ClubPin } from './ClubMap';

export const dynamic = 'force-dynamic';

export default async function DistrictMapPage() {
  const ctx = await requireDistrictGovernor();
  const db = createAdminClient();

  const { data: clubs } = await db.from('clubs')
    .select('id, name, city, state, latitude, longitude, health_score, members(count), zones(name)')
    .eq('district_id', ctx.district.id)
    .is('deleted_at', null);

  const pins: ClubPin[] = (clubs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    state: c.state,
    latitude: c.latitude == null ? null : Number(c.latitude),
    longitude: c.longitude == null ? null : Number(c.longitude),
    healthScore: c.health_score,
    memberCount: Array.isArray(c.members) ? Number((c.members as { count?: number }[])[0]?.count ?? 0) : 0,
    zoneName: (c.zones as { name?: string } | null)?.name ?? null,
  }));

  const plotted = pins.filter((p) => p.latitude != null && p.longitude != null);
  const missing = pins.length - plotted.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
          <MapPin className="text-amber-500" size={28} />
          District Map
        </h2>
        <p className="text-gray-600 text-sm mt-1 max-w-3xl">
          Geographic view of every chartered club in District {ctx.district.code}.
          Pin colour reflects club health (green ≥ 70, amber 50–69, red &lt; 50).
        </p>
      </div>
      <DistrictTabs />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total clubs" value={pins.length} />
        <KpiTile label="Plotted" value={plotted.length} color="text-emerald-700" />
        <KpiTile label="Healthy" value={plotted.filter((p) => (p.healthScore ?? 0) >= 70).length} color="text-emerald-700" />
        <KpiTile label="At risk" value={plotted.filter((p) => p.healthScore != null && p.healthScore < 50).length} color={plotted.some((p) => p.healthScore != null && p.healthScore < 50) ? 'text-rose-700' : 'text-gray-500'} />
      </div>

      {missing > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 inline-flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            {missing} club{missing === 1 ? '' : 's'} missing coordinates. Edit each club on
            <a href="/admin/clubs" className="underline ml-1">/admin/clubs</a> to add lat/lng so they appear on the map.
          </span>
        </div>
      )}

      <ClubMap pins={plotted} />
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold ${color ?? 'text-navy-900'}`}>{value}</div>
    </div>
  );
}
