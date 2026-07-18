import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { env } from '@/lib/env';
import { LogoutButton } from '@/components/admin/LogoutButton';
import {
  LayoutDashboard, Users, Banknote, HeartHandshake,
  Activity as ActivityIcon, Calendar, Mail, Settings,
  Sparkles, Megaphone, QrCode, BarChart3, Smartphone, Bell, Plug, Building2, ShieldCheck,
  Globe, Map, MapPin, RefreshCw, ScrollText, Image as ImageIcon, GitMerge,
  KeyRound, Command, Stethoscope, BookOpen,
} from 'lucide-react';

const navItems = [
  { href: '/admin',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/operations',  label: 'Command Center', icon: Command },
  { href: '/admin/diagnostics', label: 'Diagnostics',    icon: Stethoscope },
  { href: '/admin/reports',     label: 'Reports',       icon: BarChart3 },
  { href: '/admin/beneficiaries', label: 'Beneficiaries', icon: HeartHandshake },
  { href: '/admin/districts',   label: 'Districts',     icon: Globe },
  { href: '/admin/regions',     label: 'Regions',       icon: Map },
  { href: '/admin/zones',       label: 'Zones',         icon: MapPin },
  { href: '/admin/clubs',       label: 'Clubs',         icon: Building2 },
  { href: '/admin/members',     label: 'Members',       icon: Users },
  { href: '/admin/dues',        label: 'Dues',          icon: Banknote },
  { href: '/admin/donations',   label: 'Donations',     icon: HeartHandshake },
  { href: '/admin/payments',    label: 'Payments / QR', icon: QrCode },
  { href: '/admin/activities',  label: 'Activities',    icon: ActivityIcon },
  { href: '/admin/events',      label: 'Events',        icon: Calendar },
  { href: '/admin/blog',        label: 'Newsroom',      icon: BookOpen },
  { href: '/admin/media',       label: 'Media library', icon: ImageIcon },
  { href: '/admin/creative',    label: 'Creative',      icon: Sparkles },
  { href: '/admin/social',      label: 'Social',        icon: Megaphone },
  { href: '/admin/communications', label: 'Comms',      icon: Mail },
  { href: '/admin/notifications', label: 'Push',         icon: Bell },
  { href: '/admin/automation',  label: 'Automation',    icon: Settings },
  { href: '/admin/sync',        label: 'Sync',          icon: RefreshCw },
  { href: '/admin/dedupe',      label: 'Merge Duplicates', icon: GitMerge },
  { href: '/admin/governance',  label: 'Governance',   icon: ShieldCheck },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/audit',       label: 'Audit log',     icon: ScrollText },
  { href: '/admin/profile',     label: 'My Profile',    icon: KeyRound },
  { href: '/m',                 label: 'Mobile App',    icon: Smartphone },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-navy-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10 font-bold flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
            alt="Lions International"
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20 shadow"
          />
          <div className="leading-tight">
            <div>LCBRS</div>
            <div className="text-xs text-gray-400 font-normal">Admin Portal</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10"
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-sm">
          <div className="font-medium">{member.name}</div>
          <div className="text-xs text-gray-400 mb-2 capitalize">{member.role}</div>
          <LogoutButton />
        </div>
      </aside>

      <main className="relative flex-1 overflow-x-auto">
        {/* Ambient topical banner — fades out so data stays readable. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1920&q=80&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
