import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import AppointForm from './AppointForm';

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
  const supa = await createClient();

  const [clubRes, officersRes] = await Promise.all([
    supa
      .from('clubs')
      .select('id, name, club_number, district_id')
      .eq('id', clubId)
      .maybeSingle(),
    supa
      .from('officers')
      .select('id, member_id, role, term_start, term_end, status, notes, created_at')
      .eq('scope_kind', 'club')
      .eq('scope_id', clubId)
      .order('status')
      .order('term_start', { ascending: false }),
  ]);

  if (!clubRes.data) notFound();
  const club = clubRes.data as Club;
  const officers = (officersRes.data ?? []) as OfficerRow[];

  // Resolve member names in one query.
  const memberIds = Array.from(new Set(officers.map((o) => o.member_id)));
  let members: Record<string, MemberRef> = {};
  if (memberIds.length > 0) {
    const { data } = await supa
      .from('members')
      .select('id, name, email')
      .in('id', memberIds);
    members = Object.fromEntries(((data ?? []) as MemberRef[]).map((m) => [m.id, m]));
  }

  return (
    <div>
      <Link
        href={club.district_id ? `/admin/districts/${club.district_id}` : '/admin/districts'}
        className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:text-brand-600 mb-4"
      >
        <ArrowLeft size={14} /> Back to district
      </Link>

      <header className="mb-6">
        <Badge variant="default" className="mb-2">
          {club.club_number ? `Club #${club.club_number}` : 'Club'}
        </Badge>
        <h1 className="text-3xl font-bold text-navy-800">{club.name}</h1>
        <p className="text-gray-600 text-sm mt-1">Officer roster &amp; appointments</p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Appoint new officer</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointForm clubId={clubId} />
          <p className="text-xs text-gray-500 mt-3">
            Requires the actor to hold <code>officer.appoint</code> permission scoped to this
            club (club president or higher). Past terms are kept on file for history; revoking
            an officer marks the row <code>past</code>.
          </p>
        </CardContent>
      </Card>

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
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Term</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Notes</th>
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
                      <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                        {o.term_start} → {o.term_end ?? 'present'}
                      </td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-gray-600 max-w-xs">{o.notes ?? '—'}</td>
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
