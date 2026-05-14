import { Users, Target, Heart, TrendingUp } from 'lucide-react';
import { formatINRShort } from '@/lib/utils';

/**
 * Stats banner that floats over the bottom edge of the hero slideshow.
 *
 * Numbers are server-rendered live from Supabase aggregates. The "+"
 * suffix is added when the actual count rounds up — so 92 active
 * members shows as "92+", matching the friendly approximation style
 * in the reference.
 */
export function StatsBanner({
  activeMembers,
  totalActivities,
  livesImpacted,
  fundsRaised,
}: {
  activeMembers: number;
  totalActivities: number;
  livesImpacted: number;
  fundsRaised: number;
}) {
  return (
    <div className="container-page -mt-16 md:-mt-20 relative z-10 mb-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Users size={22} />}
          value={`${activeMembers}+`}
          label="Active Members"
        />
        <StatCard
          icon={<Target size={22} />}
          value={`${totalActivities}+`}
          label="Service Activities"
        />
        <StatCard
          icon={<Heart size={22} />}
          value={`${livesImpacted.toLocaleString('en-IN')}+`}
          label="Lives Impacted"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          value={`${formatINRShort(fundsRaised)}+`}
          label="Funds Raised (₹)"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon, value, label,
}: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-navy-800/85 backdrop-blur border border-white/10 text-white px-4 py-5 md:px-6 md:py-6 text-center shadow-lg">
      <div className="flex justify-center text-brand-400 mb-2">{icon}</div>
      <div className="text-2xl md:text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs md:text-sm text-gray-300 mt-1">{label}</div>
    </div>
  );
}
