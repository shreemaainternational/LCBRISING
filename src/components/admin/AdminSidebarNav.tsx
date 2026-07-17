'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Banknote, HeartHandshake,
  Activity as ActivityIcon, Calendar, Mail, Settings,
  Sparkles, Megaphone, QrCode, BarChart3, Smartphone, Bell, Plug, Building2, ShieldCheck,
  Globe, MapPin, RefreshCw, ScrollText, Image as ImageIcon,
  KeyRound, Command, Stethoscope, BookOpen, ChevronDown,
  type LucideIcon,
} from 'lucide-react';

type Leaf = { href: string; label: string; icon: LucideIcon };
type Group = { group: string; icon: LucideIcon; children: Leaf[] };
type Item = Leaf | Group;

function isGroup(i: Item): i is Group {
  return (i as Group).group !== undefined;
}

// The federation hierarchy (Districts → Zones → Clubs → Members) is collapsed
// under one "District" group; everything else stays flat.
const NAV: Item[] = [
  { href: '/admin',             label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/operations',  label: 'Command Center', icon: Command },
  { href: '/admin/diagnostics', label: 'Diagnostics',    icon: Stethoscope },
  { href: '/admin/reports',     label: 'Reports',        icon: BarChart3 },
  { href: '/admin/beneficiaries', label: 'Beneficiaries', icon: HeartHandshake },
  {
    group: 'District',
    icon: Globe,
    children: [
      { href: '/admin/districts', label: 'Districts', icon: Globe },
      { href: '/admin/zones',     label: 'Zones',     icon: MapPin },
      { href: '/admin/clubs',     label: 'Clubs',     icon: Building2 },
      { href: '/admin/members',   label: 'Members',   icon: Users },
    ],
  },
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
  { href: '/admin/notifications', label: 'Push',        icon: Bell },
  { href: '/admin/automation',  label: 'Automation',    icon: Settings },
  { href: '/admin/sync',        label: 'Sync',          icon: RefreshCw },
  { href: '/admin/governance',  label: 'Governance',    icon: ShieldCheck },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/audit',       label: 'Audit log',     icon: ScrollText },
  { href: '/admin/profile',     label: 'My Profile',    icon: KeyRound },
  { href: '/m',                 label: 'Mobile App',    icon: Smartphone },
];

const linkCls = 'flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10';

export function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-4 space-y-1">
      {NAV.map((item) =>
        isGroup(item)
          ? <NavGroup key={item.group} group={item} pathname={pathname} />
          : <NavLeaf key={item.href} leaf={item} />,
      )}
    </nav>
  );
}

function NavLeaf({ leaf }: { leaf: Leaf }) {
  const Icon = leaf.icon;
  return (
    <Link href={leaf.href} className={linkCls}>
      <Icon size={16} /> {leaf.label}
    </Link>
  );
}

function NavGroup({ group, pathname }: { group: Group; pathname: string }) {
  const containsActive = group.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(containsActive);
  const Icon = group.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${linkCls} w-full justify-between ${containsActive ? 'bg-white/5' : ''}`}
      >
        <span className="flex items-center gap-3"><Icon size={16} /> {group.group}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-1">
          {group.children.map((c) => {
            const CIcon = c.icon;
            const active = pathname === c.href || pathname.startsWith(c.href + '/');
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-white/10 ${active ? 'bg-white/10 text-white' : 'text-gray-200'}`}
              >
                <CIcon size={15} /> {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
