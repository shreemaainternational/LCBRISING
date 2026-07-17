'use client';

import { Users, Mail, Phone, BadgeCheck } from 'lucide-react';
import { QuickAddCard } from './QuickAddCard';
import { BulkMemberUpload } from './BulkMemberUpload';
import { membersPreset } from './quick-add-presets';

export type ClubMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  lions_role: string | null;
  lions_member_id: string | null;
  status: string | null;
};

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  lapsed: 'bg-gray-100 text-gray-600',
  suspended: 'bg-rose-100 text-rose-700',
};

/**
 * Per-club member management: the roster plus single ("Add member") and bulk
 * ("Bulk upload") add options, both pre-scoped to this club. Reused by the
 * hierarchy explorer's club node and the club detail page.
 */
export function ClubMembersPanel({
  club,
  members,
  compact = false,
}: {
  club: { id: string; name: string };
  members: ClubMember[];
  compact?: boolean;
}) {
  // Single-add form pre-selected to this club (club dropdown defaults to it).
  const preset = membersPreset({ clubs: [{ id: club.id, name: club.name }], clubId: club.id });

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Users size={15} className="text-emerald-500" />
          {members.length} member{members.length === 1 ? '' : 's'}
        </div>
        <QuickAddCard title="Member" {...preset} accent="emerald" description={`Add a single member to ${club.name}.`} />
      </div>

      <BulkMemberUpload
        clubs={[{ id: club.id, name: club.name }]}
        defaultClubId={club.id}
        defaultClubName={club.name}
      />

      {members.length === 0 ? (
        <p className="text-sm text-gray-500 py-3">
          No members in this club yet. Use <strong>Add member</strong> or <strong>Bulk upload</strong> above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Member #</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-navy-800">{m.name}</td>
                  <td className="px-3 py-2 text-gray-600 capitalize">
                    {(m.lions_role ?? m.role ?? '—').replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                      {m.email && <span className="inline-flex items-center gap-1 text-xs"><Mail size={11} />{m.email}</span>}
                      {m.phone && <span className="inline-flex items-center gap-1 text-xs"><Phone size={11} />{m.phone}</span>}
                      {!m.email && !m.phone && '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {m.lions_member_id
                      ? <span className="inline-flex items-center gap-1 text-xs font-mono"><BadgeCheck size={11} />{m.lions_member_id}</span>
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {m.status && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
