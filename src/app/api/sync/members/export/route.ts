/**
 * GET /api/sync/members/export — stream a CSV of every active member.
 *
 * Linked from the Command Center action `members.export`. RBAC-gated
 * with `member.read` since the catalog already lists this as a
 * read-only action.
 */
import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS: { key: string; header: string }[] = [
  { key: 'id',                  header: 'ID' },
  { key: 'lions_member_id',     header: 'Lions Member ID' },
  { key: 'name',                header: 'Name' },
  { key: 'email',               header: 'Email' },
  { key: 'phone',               header: 'Phone' },
  { key: 'status',              header: 'Status' },
  { key: 'role',                header: 'Role' },
  { key: 'lions_role',          header: 'Lions Role' },
  { key: 'joined_at',           header: 'Joined' },
  { key: 'club_id',             header: 'Club ID' },
  { key: 'district_id',         header: 'District ID' },
  { key: 'created_at',          header: 'Created' },
];

function escape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const actor = await requirePermission('member.read');
  if (isGuardFailure(actor)) return actor;

  const supa = createAdminClient();
  const { data, error } = await supa
    .from('members')
    .select(COLUMNS.map((c) => c.key).join(','))
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = COLUMNS.map((c) => c.header).join(',');
  const rows = (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return COLUMNS.map((c) => escape(r[c.key])).join(',');
  });
  const csv = [header, ...rows].join('\r\n') + '\r\n';

  const filename = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
