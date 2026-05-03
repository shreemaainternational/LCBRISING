import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { LogoutButton } from '@/components/admin/LogoutButton';
import {
  LayoutDashboard, Users, Banknote, HeartHandshake,
  Activity as ActivityIcon, Calendar, Mail, Settings,
  Sparkles, Megaphone, BookOpen,
} from 'lucide-react';

const navItems = [
  { href: '/admin',                label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/members',        label: 'Members',    icon: Users },
  { href: '/admin/dues',           label: 'Dues',       icon: Banknote },
  { href: '/admin/donations',      label: 'Donations',  icon: HeartHandshake },
  { href: '/admin/activities',     label: 'Activities', icon: ActivityIcon },
  { href: '/admin/events',         label: 'Events',     icon: Calendar },
  { href: '/admin/accounting',     label: 'Accounting', icon: BookOpen },
  { href: '/admin/creative',       label: 'Creative',   icon: Sparkles },
  { href: '/admin/social',         label: 'Social',     icon: Megaphone },
  { href: '/admin/communications', label: 'Comms',      icon: Mail },
  { href: '/admin/automation',     label: 'Automation', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-navy-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10 font-bold flex items-center gap-2">
          <span className="text-2xl">🦁</span>
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

      <main className="flex-1 p-6 md:p-10 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
