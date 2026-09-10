import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ManageOfficers from './ManageOfficers';

export const dynamic = 'force-dynamic';

type Club = {
  id: string;
  name: string;
  club_number: string | null;
  district_id: string | null;
};

type OfficerRow = {
  id: string;
  member_id: string;
  role: string;
  term_start: string;
  term_end: string | null;
  status: 'active' | 'past' | 'pending';
  notes: string | null;
  created_at: string;
  officer_type: string | null;
  is_district_cabinet: boolean | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

type MemberRef = {
  id: string;
  name: string;
  email: string;
};

const STATUS_VARIANT: Record<OfficerRow['status'], 'success' | 'outline' | 'secondary'> = {
  active: 'success',
  past: 'outline',
  pending: 'secondary',
};

export default async function ClubOfficersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clubId } = await params;
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [clubRes, officersRes] = await Promise.all([
    supa
      .from('clubs')
      .select('id, name, club_number, district_id')
      .eq('id', clubId)
      .maybeSingle(),
    supa
      .from('officers')
      .select('id, member_id, role, term_start, term_end, status, notes, created_at, officer_type, is_district_cabinet, address, contact_phone, contact_email')
      .eq('scope_kind', 'club')
      .eq('scope_id', clubId)
      .order('status')
      .order('term_start', { ascending: false }),
  ]);

  if (!clubRes.data) notFound();
  const club = clubRes.data as Club;
  const officers = (officersRes.data ?? []) as OfficerRow[];

  // Club roster (for the member picker) + resolve officer member names.
  const { data: rosterData } = await supa
    .from('members')
    .select('id, name, email')
    .eq('club_id', clubId)
    .is('deleted_at', null)
    .order('name');
  const roster = (rosterData ?? []) as MemberRef[];
  const members: Record<string, MemberRef> = Object.fromEntries(roster.map((m) => [m.id, m]));
  // Officers may reference members outside the current roster (past terms) — backfill names.
  const missing = officers.map((o) => o.member_id).filter((mid) => !members[mid]);
  if (missing.length > 0) {
    const { data } = await supa.from('members').select('id, name, email').in('id', Array.from(new Set(missing)));
    for (const m of (data ?? []) as MemberRef[]) members[m.id] = m;
  }

  const officerOpts = officers.map((o) => ({
    id: o.id, member_id: o.member_id, member_name: members[o.member_id]?.name ?? o.member_id.slice(0, 8) + '…',
    role: o.role, officer_type: o.officer_type, is_district_cabinet: !!o.is_district_cabinet, status: o.status,
  }));
  const memberOpts = roster.map((m) => ({ id: m.id, name: m.name, email: m.email }));

  return (
    <div>
      <Link
        href={club.district_id ? `/admin/districts/${club.district_id}` : '/admin/districts'}
        className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:text-brand-600 mb-4"
      >
        <ArrowLeft size={14} /> Back to district
      </Link>

      <header className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            {club.club_number ? `Club #${club.club_number}` : 'Club'}
          </Badge>
          <h1 className="text-3xl font-bold text-navy-800">{club.name}</h1>
          <p className="text-gray-600 text-sm mt-1">Officer roster &amp; appointments</p>
        </div>
        <ManageOfficers clubId={clubId} members={memberOpts} officers={officerOpts} />
      </header>

      <p className="text-xs text-gray-500 mb-6">
        Use <strong>Manage Officers</strong> to create a new assignment (Officer or Chairperson — a
        chairperson is a district-cabinet member), end an assignment, or add an officer address.
        Requires <code>officer.appoint</code> / <code>officer.revoke</code> scoped to this club. Past
        terms stay on file.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Officer history ({officers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {officers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No officers appointed for this club yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Member</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Term</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Contact</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((o) => {
                  const m = members[o.member_id];
                  return (
                    <tr key={o.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium text-navy-800">
                          {m?.name ?? <span className="text-gray-400 font-mono text-xs">{o.member_id.slice(0, 8)}…</span>}
                        </div>
                        {m?.email && <div className="text-xs text-gray-500">{m.email}</div>}
                      </td>
                      <td className="p-3 capitalize">{o.role.replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="capitalize text-xs">{o.officer_type ?? '—'}</span>
                          {o.is_district_cabinet && <Badge variant="secondary">District cabinet</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                        {o.term_start} → {o.term_end ?? 'present'}
                      </td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-gray-600 max-w-xs">
                        {[o.address, o.contact_phone, o.contact_email].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
