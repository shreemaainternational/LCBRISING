import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import {
  BookUser, Search, Crown, Briefcase, ShieldCheck, MapPin, Building2,
  Phone, Mail, MessageCircle, ChevronRight, Droplet, Heart, Stethoscope,
  Hotel, Building, Users, ArrowRight,
} from 'lucide-react';
import { DirectoryTabs } from './DirectoryTabs';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ tab?: string; q?: string }> }

export default async function MobileDirectory({ searchParams }: Props) {
  const { tab = 'district', q = '' } = await searchParams;
  const db = createAdminClient();

  const [{ data: district }, { data: clubs }, { data: officers }] = await Promise.all([
    db.from('districts').select('id, code, name, governor_name, cabinet_secretary_name, cabinet_treasurer_name').is('deleted_at', null).order('code').limit(1).maybeSingle(),
    db.from('clubs').select('id, name, club_number, city, latitude, longitude').is('deleted_at', null).order('name'),
    db.from('club_officers').select('id, role, club_id, status, members(name, email, phone)').eq('status', 'active').order('role'),
  ]);

  const clubList = (clubs ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  const officerList = (officers ?? []) as unknown as OfficerRow[];

  return (
    <div className="space-y-4">
      <header className="relative rounded-3xl overflow-hidden shadow-lg shadow-blue-900/15">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D6B] to-[#1E3A8A]" />
        <div className="relative p-4 text-white">
          <div className="inline-flex items-center gap-1.5 text-blue-200 text-[10px] uppercase tracking-[0.18em] font-bold">
            <BookUser size={11} /> Directory
          </div>
          <h1 className="text-xl font-extrabold mt-1">
            District {district?.code ?? '3232 F1'}
          </h1>
          <p className="text-[11px] text-blue-100/85 mt-0.5">
            {district?.name ?? 'District 3232 F1'}
          </p>
        </div>
      </header>

      <form className="relative" action="/m/directory">
        <input type="hidden" name="tab" value={tab} />
        <input type="search" name="q" defaultValue={q}
          placeholder="Search clubs, officers, vendors…"
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl border bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </form>

      <DirectoryTabs active={tab} />

      {tab === 'district' && (
        <section className="space-y-3">
          <CategoryGroup title="DG Team" icon={Crown}>
            <PersonCard role="District Governor" name={district?.governor_name ?? '—'} />
            <PersonCard role="Cabinet Secretary" name={district?.cabinet_secretary_name ?? '—'} />
            <PersonCard role="Cabinet Treasurer" name={district?.cabinet_treasurer_name ?? '—'} />
          </CategoryGroup>

          <CategoryGroup title="Cabinet Officers" icon={ShieldCheck}>
            {officerList.length === 0 ? (
              <EmptyHint>No cabinet officers entered yet. Add them from /admin/governance.</EmptyHint>
            ) : officerList.slice(0, 20).map((o) => (
              <PersonCard key={o.id}
                role={o.role.replace(/_/g, ' ')}
                name={o.members?.name ?? '—'}
                phone={o.members?.phone}
                email={o.members?.email} />
            ))}
          </CategoryGroup>

          <CategoryGroup title="Quick Links" icon={ArrowRight} flat>
            <QuickLink href="/multi-district" icon={Crown} label="Multi-District Council" />
            <QuickLink href="/district/calendar" icon={MapPin} label="District Calendar" />
            <QuickLink href="/district/circulars" icon={Building2} label="District Circulars" />
            <QuickLink href="/m/blood" icon={Droplet} label="Blood Directory" />
          </CategoryGroup>
        </section>
      )}

      {tab === 'clubs' && (
        <section className="space-y-2">
          {clubList.length === 0 ? (
            <EmptyHint>No clubs match.</EmptyHint>
          ) : clubList.map((c) => (
            <Link key={c.id} href={`/admin/clubs/${c.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-navy-900 truncate">{c.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {c.club_number && <>#{c.club_number} · </>}{c.city ?? '—'}
                </div>
              </div>
              {c.latitude && c.longitude && (
                <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" rel="noopener"
                  aria-label="Open in maps"
                  className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                  <MapPin size={14} />
                </a>
              )}
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
        </section>
      )}

      {tab === 'others' && (
        <section className="space-y-3">
          <CategoryGroup title="Service Network" icon={Heart} flat>
            <QuickLink href="/m/blood" icon={Droplet} label="Blood Donors" badge="Live" />
            <QuickLink href="/m/directory/hospitals" icon={Stethoscope} label="Hospital Partners" />
            <QuickLink href="/m/directory/ngo-partners" icon={Heart} label="NGO Partners" />
            <QuickLink href="/m/directory/csr-companies" icon={Briefcase} label="CSR Companies" />
          </CategoryGroup>
          <CategoryGroup title="Vendors & Venues" icon={Building} flat>
            <QuickLink href="/m/directory/vendors" icon={Briefcase} label="Lions Vendors" />
            <QuickLink href="/m/directory/sponsors" icon={Crown} label="Sponsor Directory" />
            <QuickLink href="/m/directory/venues" icon={MapPin} label="Event Venues" />
            <QuickLink href="/m/directory/hotels" icon={Hotel} label="Hotel Partners" />
          </CategoryGroup>
          <CategoryGroup title="Emergency" icon={Phone} flat>
            <QuickLink href="tel:+919712299333" icon={Phone} label="District Helpline" />
            <QuickLink href="/m/directory/emergency" icon={Heart} label="Emergency Contacts" />
          </CategoryGroup>
        </section>
      )}
    </div>
  );
}

interface OfficerRow {
  id: string; role: string; club_id: string | null; status: string;
  members: { name?: string; email?: string; phone?: string } | null;
}

function CategoryGroup({ title, icon: Icon, children, flat }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode; flat?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Icon size={12} className="text-blue-800" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{title}</h2>
      </div>
      <div className={flat ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>{children}</div>
    </div>
  );
}

function PersonCard({ role, name, phone, email }: {
  role: string; name: string; phone?: string | null; email?: string | null;
}) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-navy-900 truncate">{name || '—'}</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-0.5">{role}</div>
      </div>
      <div className="flex gap-1">
        {phone && (
          <a href={`tel:${phone}`} aria-label="Call"
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Phone size={14} />
          </a>
        )}
        {phone && (
          <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener" aria-label="WhatsApp"
            className="w-9 h-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <MessageCircle size={14} />
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} aria-label="Email"
            className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
            <Mail size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, badge }: {
  href: string; icon: React.ComponentType<{ size?: number }>; label: string; badge?: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-[0.99] transition">
      <div className="flex items-center justify-between mb-1.5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
          <Icon size={16} />
        </div>
        {badge && <span className="text-[9px] uppercase tracking-wider font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="text-xs font-semibold text-navy-900 leading-tight">{label}</div>
    </Link>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center text-xs text-gray-500 border border-gray-100">
      <Users size={20} className="mx-auto text-gray-300 mb-2" />
      {children}
    </div>
  );
}
