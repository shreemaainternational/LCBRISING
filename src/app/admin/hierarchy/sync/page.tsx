import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { HierarchySyncConsole } from './HierarchySyncConsole';

export const dynamic = 'force-dynamic';

export default async function HierarchySyncPage() {
  await requireAdminPage();
  const db = createAdminClient();
  const [{ data: zones }, { data: regions }, { data: districts }] = await Promise.all([
    db.from('zones').select('id, name, code').is('deleted_at', null).order('code'),
    db.from('regions').select('id, name, code').is('deleted_at', null).order('code'),
    db.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-800 mb-1">Hierarchy Sync</h1>
        <p className="text-gray-600 max-w-3xl">
          District → Region → Zone → Club → Member. Each member’s zone, region and district come from
          their club; every change below is previewed, needs a reason, and is recorded in the club
          assignment history and audit log. To move a member to another club, use{' '}
          <Link href="/admin/members" className="font-semibold text-brand-700 hover:underline">Members</Link>.
        </p>
      </div>
      <HierarchySyncConsole
        zones={(zones ?? []).map((z) => ({ id: z.id, name: z.code ? `${z.name} (${z.code})` : z.name }))}
        regions={(regions ?? []).map((r) => ({ id: r.id, name: r.code ? `${r.name} (${r.code})` : r.name }))}
        districts={(districts ?? []).map((d) => ({ id: d.id, name: `District ${d.code}` }))}
      />
    </div>
  );
}
