import Link from 'next/link';
import {
  Plus, Camera, Gift, Briefcase, Calendar, Droplet, UserPlus, Megaphone, X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const ACTIONS = [
  { href: '/m/activities/new', label: 'Report Service Activity', icon: Plus, color: 'from-blue-500 to-blue-700' },
  { href: '/m/activities/new?focus=photos', label: 'Upload Photos', icon: Camera, color: 'from-emerald-500 to-emerald-700' },
  { href: '/m/greetings/new', label: 'Create Greeting', icon: Gift, color: 'from-rose-500 to-rose-700' },
  { href: '/m/networking/deals/new', label: 'Add Business Deal', icon: Briefcase, color: 'from-purple-500 to-purple-700' },
  { href: '/m/events', label: 'Register for Event', icon: Calendar, color: 'from-indigo-500 to-indigo-700' },
  { href: '/m/blood/request', label: 'Emergency Blood Request', icon: Droplet, color: 'from-rose-600 to-red-700' },
  { href: '/m/networking/refer', label: 'Add Member Reference', icon: UserPlus, color: 'from-teal-500 to-teal-700' },
  { href: '/m/announcements/new', label: 'Create Announcement', icon: Megaphone, color: 'from-amber-500 to-orange-600' },
];

export default function RisingStarMenu() {
  return (
    <div className="relative min-h-[80vh] -m-4 p-4 bg-gradient-to-b from-[#0B2D6B] via-[#0B2D6B] to-blue-900 text-white rounded-t-3xl overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(244,180,0,0.6), transparent 35%), radial-gradient(circle at 80% 90%, rgba(99,102,241,0.5), transparent 40%)' }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2 font-bold">
              ✦ Rising Star Center
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">
              Shine for a<br/>Better Tomorrow
            </h1>
            <p className="text-xs text-blue-100/80 mt-2 max-w-xs">
              Quick actions for the moments that matter. Tap to log, share or announce.
            </p>
          </div>
          <Link href="/m" aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
            <X size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 active:scale-95 transition group">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg shadow-black/20 mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-sm font-semibold leading-tight">{a.label}</div>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[10px] text-blue-200/60">
          Some destinations are still being built — you'll land on a placeholder until they ship.
        </p>
      </div>
    </div>
  );
}
