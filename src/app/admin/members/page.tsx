import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { membersPreset } from '@/components/admin/quick-add-presets';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  await requireAdminPage();
  // Service-role read: the members self-read policy is self-referential and
  // trips RLS recursion under the user session on DBs missing migration 0059.
  const supabase = createAdminClient();
  const [{ data: members }, { data: clubs }] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: false }),
    supabase.from('clubs').select('id, name').is('deleted_at', null).order('name'),
  ]);

  const preset = membersPreset({ clubs: clubs ?? [] });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Members</h1>
          <p className="text-gray-600">All members across the chapter.</p>
        </div>
        <QuickAddCard title="Member" {...preset} />
      </div>

      {!members?.length ? (
        <EmptyState
          icon={<Users size={26} />}
          title="No members yet"
          description="Add your first Lion or Leo to the roster."
          cta={<QuickAddCard title="Member" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{members.length} members</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-medium">{m.name}</td>
                    <td className="p-3">{m.email}</td>
                    <td className="p-3">{m.phone ?? '—'}</td>
                    <td className="p-3 capitalize">{m.role}</td>
                    <td className="p-3"><StatusBadge status={m.status} /></td>
                    <td className="p-3 text-gray-500">{m.joined_at ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const v = status === 'active' ? 'success'
    : status === 'lapsed' ? 'warning'
    : status === 'suspended' ? 'danger'
    : 'secondary';
  return <Badge variant={v as 'success' | 'warning' | 'danger' | 'secondary'}>{status}</Badge>;
}
