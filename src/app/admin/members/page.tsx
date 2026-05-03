import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('members').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Members</h1>
      <p className="text-gray-600 mb-8">All members across the chapter.</p>

      <Card>
        <CardHeader><CardTitle>{members?.length ?? 0} members</CardTitle></CardHeader>
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
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3">{m.email}</td>
                  <td className="p-3">{m.phone ?? '—'}</td>
                  <td className="p-3 capitalize">{m.role}</td>
                  <td className="p-3"><StatusBadge status={m.status} /></td>
                  <td className="p-3 text-gray-500">{m.joined_at ?? '—'}</td>
                </tr>
              ))}
              {(!members || members.length === 0) && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No members yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
