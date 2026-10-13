import {
  LayoutDashboard, Users, Banknote, HeartHandshake,
  Activity as ActivityIcon, Calendar, Mail, Settings,
  Sparkles, Megaphone, QrCode, BarChart3, Smartphone, Bell, Plug, Building2, ShieldCheck,
  Globe, MapPin, RefreshCw, ScrollText, Image as ImageIcon, Images,
  KeyRound, Command, Stethoscope, BookOpen, Target, Network, Map as MapIcon, Layers, Landmark,
  ClipboardCheck, Menu as MenuIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavLeaf = { href: string; label: string; icon: LucideIcon };
export type NavSection = { id: string; title: string; collapsible?: boolean; items: NavLeaf[] };

/**
 * Single source of truth for the admin CRM navigation (sidebar + mobile drawer).
 *
 * Grouping follows the combined design direction:
 *  - CRM-dashboard style (Atlas): short "Overview" section on top, finance and
 *    engagement grouped as pipelines rather than a flat 30-item list.
 *  - NGO-workflow style (NUO): "Service & Impact" is ordered as the lifecycle a
 *    service project moves through — plan → deliver → approve → beneficiaries →
 *    report.
 *
 * Every route here already existed before this change; nothing was added or
 * removed, only regrouped. Keep it that way: a new page gets a new entry here,
 * not a second nav.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      { href: '/admin',             label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/admin/operations',  label: 'Command Center', icon: Command },
      { href: '/admin/reports',     label: 'Reports',        icon: BarChart3 },
    ],
  },
  {
    id: 'impact',
    title: 'Service & Impact',
    items: [
      { href: '/admin/events',        label: 'Events & Plans',   icon: Calendar },
      { href: '/admin/activities',    label: 'Service Activities', icon: ActivityIcon },
      { href: '/admin/activities?status=pending', label: 'Approvals', icon: ClipboardCheck },
      { href: '/admin/beneficiaries', label: 'Beneficiaries',    icon: HeartHandshake },
      { href: '/admin/campaigns',     label: 'Campaigns',        icon: Target },
    ],
  },
  {
    id: 'finance',
    title: 'Funds',
    items: [
      { href: '/admin/donations', label: 'Donations',     icon: HeartHandshake },
      { href: '/admin/dues',      label: 'Dues',          icon: Banknote },
      { href: '/admin/payments',  label: 'Payments / QR', icon: QrCode },
    ],
  },
  {
    id: 'federation',
    title: 'Federation',
    collapsible: true,
    items: [
      { href: '/admin/members',   label: 'Members',   icon: Users },
      { href: '/admin/clubs',     label: 'Clubs',     icon: Building2 },
      { href: '/admin/hierarchy', label: 'Hierarchy', icon: Network },
      { href: '/admin/zones',     label: 'Zones',     icon: MapPin },
      { href: '/admin/regions',   label: 'Regions',   icon: MapIcon },
      { href: '/admin/districts', label: 'Districts', icon: Globe },
      { href: '/admin/multiple-districts', label: 'Multiple Districts', icon: Layers },
      { href: '/admin/constitutional-areas', label: 'Constitutional Areas', icon: Landmark },
    ],
  },
  {
    id: 'engage',
    title: 'Engagement',
    collapsible: true,
    items: [
      { href: '/admin/communications', label: 'Comms',         icon: Mail },
      { href: '/admin/notifications',  label: 'Push',          icon: Bell },
      { href: '/admin/social',         label: 'Social',        icon: Megaphone },
      { href: '/admin/blog',           label: 'Newsroom',      icon: BookOpen },
      { href: '/admin/stories',        label: 'Human Stories', icon: HeartHandshake },
      { href: '/admin/gallery',        label: 'Gallery',       icon: Images },
      { href: '/admin/media',          label: 'Media library', icon: ImageIcon },
      { href: '/admin/creative',       label: 'Creative',      icon: Sparkles },
      { href: '/admin/templates',      label: 'Templates',     icon: ScrollText },
    ],
  },
  {
    id: 'system',
    title: 'System',
    collapsible: true,
    items: [
      { href: '/admin/governance',   label: 'Governance',   icon: ShieldCheck },
      { href: '/admin/automation',   label: 'Automation',   icon: Settings },
      { href: '/admin/sync',         label: 'Sync',         icon: RefreshCw },
      { href: '/admin/integrations', label: 'Integrations', icon: Plug },
      { href: '/admin/settings/menu', label: 'Website Menu', icon: MenuIcon },
      { href: '/admin/diagnostics',  label: 'Diagnostics',  icon: Stethoscope },
      { href: '/admin/audit',        label: 'Audit log',    icon: ScrollText },
      { href: '/admin/profile',      label: 'My Profile',   icon: KeyRound },
      { href: '/m',                  label: 'Mobile App',   icon: Smartphone },
    ],
  },
];

/**
 * Active-route test. Query-string entries (e.g. Approvals) only match when the
 * query matches; `/admin` only matches exactly so the Dashboard isn't lit on
 * every admin page.
 */
export function isActive(href: string, pathname: string, search: string): boolean {
  const [path, query] = href.split('?');
  if (query) return pathname === path && new URLSearchParams(search).toString().includes(query);
  if (path === '/admin') return pathname === '/admin';
  if (path === '/admin/activities' && new URLSearchParams(search).get('status') === 'pending') return false;
  return pathname === path || pathname.startsWith(path + '/');
}
