/**
 * CRM Action Map — single source of truth for every operation a CRM
 * user can perform. Drives:
 *   - /admin/operations (the Command Center page)
 *   - <QuickActionsBar /> on /admin
 *   - Future: command-palette (⌘K) lookups, role-aware action menus
 *
 * Every entry maps an action to:
 *   - href (where the button goes)
 *   - the integration(s) it touches (so we can grey-out unavailable
 *     actions when, e.g., Lions REST API isn't configured)
 *   - the automation mode (manual / cron / trigger / AI-assisted)
 */
import {
  Users, Building2, Banknote, HeartHandshake, Activity, CalendarDays, ImageIcon,
  Sparkles, Megaphone, Mail, Bell, Settings, RefreshCw, ShieldCheck, Plug,
  ScrollText, Smartphone, BarChart3, Globe, MapPin, QrCode, KeyRound,
  Send, Vote, Bot, Map as MapIcon, Phone, CreditCard, FileText,
  Award, GraduationCap, MessageSquare, CheckSquare, Pin, Layers, Download,
  Upload, Server, Workflow, Cloud, Stamp, Briefcase,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type ActionCategory =
  | 'members'
  | 'clubs'
  | 'governance'
  | 'finance'
  | 'activities'
  | 'communications'
  | 'media'
  | 'reports'
  | 'sync'
  | 'integrations'
  | 'platform'
  | 'portals';

export type AutomationMode =
  | 'manual'         // human-initiated only
  | 'cron'           // also runs on schedule
  | 'trigger'        // also fires on a DB event
  | 'ai-assisted'    // augmented by LLM
  | 'webhook'        // also reachable from webhook
  | 'bulk';          // supports bulk operation

export type IntegrationKey =
  | 'supabase_auth' | 'lions_oidc' | 'lions_rest' | 'razorpay' | 'phonepe' | 'upi'
  | 'resend' | 'twilio' | 'whatsapp_business' | 'web_push' | 'openai'
  | 'facebook' | 'instagram' | 'linkedin' | 'canva' | 'cloudinary'
  | 'vercel_cron';

export interface CrmAction {
  key: string;
  label: string;
  description: string;
  href: string;
  category: ActionCategory;
  icon: ComponentType<{ size?: number; className?: string }>;
  modes: AutomationMode[];
  integrations: IntegrationKey[];
  /** Keywords for ⌘K palette search. */
  search?: string[];
  /** If set, the action is hidden when the integration is unavailable. */
  requires?: IntegrationKey;
}

export const CATEGORY_META: Record<ActionCategory, { label: string; icon: ComponentType<{ size?: number; className?: string }>; color: string }> = {
  members:        { label: 'Members',         icon: Users,        color: 'bg-blue-100 text-blue-700' },
  clubs:          { label: 'Clubs',           icon: Building2,    color: 'bg-cyan-100 text-cyan-700' },
  governance:     { label: 'Governance',      icon: ShieldCheck,  color: 'bg-indigo-100 text-indigo-700' },
  finance:        { label: 'Finance',         icon: Banknote,     color: 'bg-amber-100 text-amber-700' },
  activities:     { label: 'Activities',      icon: Activity,     color: 'bg-emerald-100 text-emerald-700' },
  communications: { label: 'Communications',  icon: Megaphone,    color: 'bg-rose-100 text-rose-700' },
  media:          { label: 'Media',           icon: ImageIcon,    color: 'bg-pink-100 text-pink-700' },
  reports:        { label: 'Reports',         icon: BarChart3,    color: 'bg-purple-100 text-purple-700' },
  sync:           { label: 'Sync & Lions Intl', icon: RefreshCw,  color: 'bg-orange-100 text-orange-700' },
  integrations:   { label: 'Integrations',    icon: Plug,         color: 'bg-slate-100 text-slate-700' },
  platform:       { label: 'Platform',        icon: Server,       color: 'bg-gray-100 text-gray-700' },
  portals:        { label: 'Portals',         icon: Layers,       color: 'bg-teal-100 text-teal-700' },
};

export const CRM_ACTIONS: CrmAction[] = [
  // ---------------- MEMBERS ----------------
  { key: 'members.list', label: 'All Members', description: 'Browse, search and filter every member', href: '/admin/members', category: 'members', icon: Users, modes: ['manual', 'bulk'], integrations: ['supabase_auth'], search: ['member', 'people', 'roster'] },
  { key: 'members.new', label: 'Add Member', description: 'Manually add a new member or invite via email', href: '/admin/members?new=1', category: 'members', icon: Users, modes: ['manual'], integrations: ['supabase_auth', 'resend'] },
  { key: 'members.import', label: 'CSV Import', description: 'Bulk import members from a CSV export', href: '/admin/sync', category: 'members', icon: Upload, modes: ['manual', 'bulk'], integrations: ['supabase_auth'] },
  { key: 'members.export', label: 'CSV Export', description: 'Download all members as CSV', href: '/api/sync/members/export', category: 'members', icon: Download, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'members.dedupe', label: 'AI Duplicate Detector', description: 'Find duplicate member records with rule + AI scoring', href: '/admin/sync/duplicates', category: 'members', icon: Bot, modes: ['manual', 'ai-assisted'], integrations: ['openai', 'supabase_auth'] },

  // ---------------- CLUBS ----------------
  { key: 'clubs.list', label: 'All Clubs', description: 'Browse every chartered club', href: '/admin/clubs', category: 'clubs', icon: Building2, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'clubs.map', label: 'District Map', description: 'Geo view of every club coloured by health', href: '/district/map', category: 'clubs', icon: MapIcon, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'clubs.health', label: 'Club Health Scoring', description: '5-component score with AI commentary', href: '/admin/governance', category: 'clubs', icon: Sparkles, modes: ['cron', 'ai-assisted'], integrations: ['openai', 'supabase_auth'] },
  { key: 'clubs.zones', label: 'Zones', description: 'Manage zones inside a district', href: '/admin/zones', category: 'clubs', icon: MapPin, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'clubs.districts', label: 'Districts', description: 'Manage districts inside a multiple district', href: '/admin/districts', category: 'clubs', icon: Globe, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- GOVERNANCE ----------------
  { key: 'gov.console', label: 'Governance Console', description: 'Officer transitions, club health, audit summary', href: '/admin/governance', category: 'governance', icon: ShieldCheck, modes: ['manual', 'cron'], integrations: ['supabase_auth'] },
  { key: 'gov.audit', label: 'Audit Log', description: 'Append-only log of every significant action', href: '/admin/audit', category: 'governance', icon: ScrollText, modes: ['trigger'], integrations: ['supabase_auth'] },
  { key: 'gov.approvals', label: 'Activity Approvals', description: 'Zone-chair queue for approving club activities', href: '/zone/approvals', category: 'governance', icon: CheckSquare, modes: ['trigger', 'manual'], integrations: ['supabase_auth'] },
  { key: 'gov.voting', label: 'Digital Voting', description: 'Cast votes on attached advisories', href: '/zone/advisories', category: 'governance', icon: Vote, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'gov.zone-analytics', label: 'Zone Analytics & Forecast', description: 'Power-BI-style cross-club comparison with 3-month predictions', href: '/zone/analytics', category: 'governance', icon: Sparkles, modes: ['manual', 'ai-assisted'], integrations: ['supabase_auth'] },
  { key: 'gov.zone-awards', label: 'Award Eligibility', description: 'Live scorecard for Club Excellence / 100% President / DG Honor', href: '/zone/awards', category: 'governance', icon: Award, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- FINANCE ----------------
  { key: 'fin.dues', label: 'Dues — All Tiers', description: 'Club / District / International dues + ageing', href: '/admin/dues', category: 'finance', icon: Banknote, modes: ['cron', 'manual'], integrations: ['supabase_auth'] },
  { key: 'fin.donations', label: 'Donations', description: 'Track donations + 80G receipts', href: '/admin/donations', category: 'finance', icon: HeartHandshake, modes: ['manual', 'webhook'], integrations: ['supabase_auth'] },
  { key: 'fin.payments', label: 'Payments & QR', description: 'UPI QR codes, payment links, reconciliation', href: '/admin/payments', category: 'finance', icon: QrCode, modes: ['manual', 'webhook'], integrations: ['razorpay', 'phonepe', 'upi'] },
  { key: 'fin.tax-pack', label: '80G Donor Pack (Annual)', description: 'Consolidated FY statement emailed in April', href: '/api/cron/donor-pack', category: 'finance', icon: Stamp, modes: ['cron'], integrations: ['resend', 'supabase_auth'] },
  { key: 'fin.commissions', label: 'Commissions', description: 'Track sponsorships and commission splits', href: '/admin/commissions', category: 'finance', icon: Briefcase, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- ACTIVITIES ----------------
  { key: 'act.list', label: 'All Activities', description: 'Browse every filed activity / service project', href: '/admin/activities', category: 'activities', icon: Activity, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'act.events', label: 'Events Calendar', description: 'Year-long Lions calendar + DG visits + meetings', href: '/admin/events', category: 'activities', icon: CalendarDays, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'act.beneficiaries', label: 'Beneficiary CRM', description: 'Per-beneficiary records linked to activities', href: '/admin/beneficiaries', category: 'activities', icon: HeartHandshake, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- COMMUNICATIONS ----------------
  { key: 'comm.circulars', label: 'District Circulars', description: 'Broadcast to every club via portal/email/push/WhatsApp', href: '/district/circulars', category: 'communications', icon: Megaphone, modes: ['manual', 'webhook'], integrations: ['resend', 'web_push', 'whatsapp_business'] },
  { key: 'comm.email', label: 'Email Campaigns', description: 'Send transactional and bulk emails via Resend', href: '/admin/communications', category: 'communications', icon: Mail, modes: ['manual', 'bulk'], integrations: ['resend'] },
  { key: 'comm.push', label: 'Push Notifications', description: 'Web push to PWA installs (auto-VAPID)', href: '/admin/notifications', category: 'communications', icon: Bell, modes: ['manual', 'bulk'], integrations: ['web_push'] },
  { key: 'comm.social', label: 'Social Posts', description: 'One-click to Facebook, Instagram, LinkedIn', href: '/admin/social', category: 'communications', icon: Send, modes: ['manual'], integrations: ['facebook', 'instagram', 'linkedin'] },
  { key: 'comm.whatsapp', label: 'WhatsApp Broadcasts', description: 'Send templates via Cloud API or Twilio', href: '/admin/communications', category: 'communications', icon: Phone, modes: ['manual'], integrations: ['whatsapp_business', 'twilio'] },

  // ---------------- MEDIA ----------------
  { key: 'media.library', label: 'Media Library', description: 'Upload, tag and re-use activity photos', href: '/admin/media', category: 'media', icon: ImageIcon, modes: ['manual'], integrations: ['cloudinary', 'supabase_auth'] },
  { key: 'media.creative', label: 'Creative (Canva)', description: 'Branded posters via Canva Connect API', href: '/admin/creative', category: 'media', icon: Sparkles, modes: ['manual', 'ai-assisted'], integrations: ['canva', 'openai'] },

  // ---------------- REPORTS ----------------
  { key: 'rep.list', label: 'Reports Library', description: 'Every generated PDF / PPTX', href: '/admin/reports', category: 'reports', icon: BarChart3, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'rep.new', label: 'Generate Report', description: 'Build a PDF or PPTX with charts and AI narrative', href: '/admin/reports/new', category: 'reports', icon: FileText, modes: ['manual', 'ai-assisted', 'cron'], integrations: ['supabase_auth', 'openai'] },
  { key: 'rep.district-export', label: 'District CSV Export', description: 'KPIs and region roll-ups in one CSV', href: '/api/district/export', category: 'reports', icon: Download, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'rep.md-export', label: 'MD Council CSV Export', description: 'Multi-District KPIs + district roll-ups', href: '/api/multi-district/export', category: 'reports', icon: Download, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- SYNC ----------------
  { key: 'sync.dashboard', label: 'Sync Dashboard', description: '6-entity sync coverage + queue health', href: '/admin/sync', category: 'sync', icon: RefreshCw, modes: ['manual', 'cron'], integrations: ['supabase_auth'] },
  { key: 'sync.lions', label: 'Lions Master Sync', description: 'Pull districts/clubs/members from MyLCI REST', href: '/admin/sync/lions', category: 'sync', icon: Cloud, modes: ['manual', 'cron'], integrations: ['lions_rest'] },
  { key: 'sync.queue.drain', label: 'Drain Queue', description: 'Force-process pending sync jobs now', href: '/admin/sync', category: 'sync', icon: Workflow, modes: ['manual', 'cron'], integrations: ['supabase_auth'] },
  { key: 'sync.queue.revive', label: 'Revive Dead Jobs', description: 'Re-queue every dead or failed sync job', href: '/admin/sync', category: 'sync', icon: RefreshCw, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'sync.csv-import', label: 'CSV Import', description: 'Bulk import any entity from CSV', href: '/admin/sync', category: 'sync', icon: Upload, modes: ['manual', 'bulk'], integrations: ['supabase_auth'] },
  { key: 'sync.dedupe', label: 'Duplicate Detector', description: 'Find duplicate member records (rule + AI)', href: '/admin/sync/duplicates', category: 'sync', icon: Bot, modes: ['manual', 'ai-assisted'], integrations: ['openai'] },

  // ---------------- INTEGRATIONS ----------------
  { key: 'int.health', label: 'Integration Health', description: 'Status of every external system at a glance', href: '/admin/integrations', category: 'integrations', icon: Plug, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'int.oidc', label: 'Lions SSO (OIDC)', description: 'PKCE + JWKS configuration, role mapping', href: '/admin/integrations/oidc', category: 'integrations', icon: KeyRound, modes: ['manual'], integrations: ['lions_oidc'] },
  { key: 'int.cron', label: 'Cron Secret', description: 'Auto-provisioned secret for scheduled jobs', href: '/admin/integrations/cron', category: 'integrations', icon: Server, modes: ['manual', 'cron'], integrations: ['vercel_cron'] },
  { key: 'int.push', label: 'Web Push (VAPID)', description: 'Auto-provisioned VAPID keypair', href: '/admin/integrations/push', category: 'integrations', icon: Bell, modes: ['manual'], integrations: ['web_push'] },

  // ---------------- PLATFORM ----------------
  { key: 'plat.automation', label: 'Automation Engine', description: 'Daily rule-based actions (dues, alerts, reminders)', href: '/admin/automation', category: 'platform', icon: Workflow, modes: ['cron', 'trigger'], integrations: ['supabase_auth'] },
  { key: 'plat.awards', label: 'Awards Catalog', description: 'PMJF / MJF / Excellence / Leadership tracking', href: '/admin/governance', category: 'platform', icon: Award, modes: ['manual', 'cron'], integrations: ['supabase_auth'] },
  { key: 'plat.learning', label: 'Learning Center', description: 'Member training & certification progress', href: '/admin/members', category: 'platform', icon: GraduationCap, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'plat.mobile', label: 'Mobile App (PWA)', description: 'Installable PWA at /m for members', href: '/m', category: 'platform', icon: Smartphone, modes: ['manual'], integrations: ['web_push'] },
  { key: 'plat.profile', label: 'My Profile', description: 'Change password, manage your account', href: '/admin/profile', category: 'platform', icon: KeyRound, modes: ['manual'], integrations: ['supabase_auth'] },

  // ---------------- PORTALS ----------------
  { key: 'portal.zone', label: 'Zone Chair Portal', description: 'Multi-club zone-level dashboard', href: '/zone', category: 'portals', icon: Layers, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'portal.region', label: 'Region Chair Portal', description: 'Region-wide roll-up across zones', href: '/region', category: 'portals', icon: Layers, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'portal.district', label: 'District Governor Portal', description: 'District-wide governance + sync console', href: '/district', category: 'portals', icon: Layers, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'portal.md', label: 'Multi-District Council Portal', description: 'MD-wide roll-up — tops the hierarchy', href: '/multi-district', category: 'portals', icon: Layers, modes: ['manual'], integrations: ['supabase_auth'] },
  { key: 'portal.member', label: 'Member Self-Service', description: 'Donation history, preferences, magic-link login', href: '/portal', category: 'portals', icon: Users, modes: ['manual'], integrations: ['supabase_auth'] },
];

export function actionsByCategory(): Record<ActionCategory, CrmAction[]> {
  const out = {} as Record<ActionCategory, CrmAction[]>;
  for (const cat of Object.keys(CATEGORY_META) as ActionCategory[]) out[cat] = [];
  for (const a of CRM_ACTIONS) out[a.category].push(a);
  return out;
}

export function findAction(key: string): CrmAction | undefined {
  return CRM_ACTIONS.find((a) => a.key === key);
}

export function searchActions(query: string): CrmAction[] {
  const q = query.toLowerCase().trim();
  if (!q) return CRM_ACTIONS;
  return CRM_ACTIONS.filter((a) => {
    const haystack = [a.label, a.description, a.category, ...(a.search ?? [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
