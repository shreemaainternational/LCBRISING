import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Crown, ShieldCheck, Building2, MapPin, Phone, Mail, MessageCircle, Users,
} from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHero } from '@/components/site/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { LogoutButton } from '@/components/admin/LogoutButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Member Directory',
  robots: { index: false, follow: false },
  alternates: { canonical: '/directory' },
};

type OfficerRow = {
  id: string;
  role: string;
  members: { name?: string; email?: string; phone?: string } | null;
};

/**
 * Member-only directory of district leadership, cabinet officers and clubs.
 * Gated by the same member login used by /admin and /m — signed-out
 * visitors are bounced to /login and returned here afterwards.
 */
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/directory');

  const { q = '' } = await searchParams;
  const db = createAdminClient();

  const [{ data: district }, { data: clubs }, { data: officers }] = await Promise.all([
    db
      .from('districts')
      .select('id, code, name, governor_name, cabinet_secretary_name, cabinet_treasurer_name')
      .is('deleted_at', null)
      .order('code')
      .limit(1)
      .maybeSingle(),
    db
      .from('clubs')
      .select('id, name, club_number, city, latitude, longitude')
      .is('deleted_at', null)
      .order('name'),
    db
      .from('club_officers')
      .select('id, role, status, members(name, email, phone)')
      .eq('status', 'active')
      .order('role'),
  ]);

  const clubList = (clubs ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q.toLowerCase()),
  );
  const officerList = (officers ?? []) as unknown as OfficerRow[];

  return (
    <>
      <PageHero
        pillText="MEMBERS ONLY"
        headline="Member Directory"
        subtitle={`District ${district?.code ?? '3232 F1'} leadership, cabinet officers and clubs.`}
      />

      <section className="container-page py-14 md:py-16 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3 -mt-2">
          <p className="text-sm text-gray-500">
            Signed in as <strong className="text-navy-800">{member.name ?? member.email}</strong>
          </p>
          <LogoutButton />
        </div>

        <div>
          <SectionHeading icon={Crown} title="DG Team" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PersonCard role="District Governor" name={district?.governor_name ?? '—'} />
            <PersonCard role="Cabinet Secretary" name={district?.cabinet_secretary_name ?? '—'} />
            <PersonCard role="Cabinet Treasurer" name={district?.cabinet_treasurer_name ?? '—'} />
          </div>
        </div>

        <div>
          <SectionHeading icon={ShieldCheck} title="Cabinet Officers" />
          {officerList.length === 0 ? (
            <EmptyHint>No cabinet officers on file yet.</EmptyHint>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {officerList.map((o) => (
                <PersonCard
                  key={o.id}
                  role={o.role.replace(/_/g, ' ')}
                  name={o.members?.name ?? '—'}
                  phone={o.members?.phone}
                  email={o.members?.email}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <SectionHeading icon={Building2} title="Clubs" bare />
            <form action="/directory" className="w-full sm:w-64">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search clubs…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </form>
          </div>
          {clubList.length === 0 ? (
            <EmptyHint>No clubs match your search.</EmptyHint>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clubList.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-navy-900">{c.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {c.club_number && <>#{c.club_number} · </>}
                        {c.city ?? '—'}
                      </div>
                    </div>
                    {c.latitude && c.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open in maps"
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-blue-50 text-blue-700"
                      >
                        <MapPin size={14} />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  bare = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  bare?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${bare ? '' : 'mb-4'}`}>
      <Icon size={16} className="text-brand-500" aria-hidden />
      <h2 className="text-lg font-bold text-navy-800">{title}</h2>
    </div>
  );
}

function PersonCard({
  role,
  name,
  phone,
  email,
}: {
  role: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-navy-900">{name || '—'}</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {role}
          </div>
        </div>
        <div className="flex flex-none gap-1">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="Call"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
            >
              <Phone size={13} />
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-700"
            >
              <MessageCircle size={13} />
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              aria-label="Email"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700"
            >
              <Mail size={13} />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
      <Users size={20} className="mx-auto mb-2 text-gray-300" />
      {children}
    </div>
  );
}
