import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const supabase = await createClient();
  const [{ data: members }, { data: clubs }] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: false }),
    supabase.from('clubs').select('id, name').is('deleted_at', null).order('name'),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Members</h1>
          <p className="text-gray-600">All members across the chapter.</p>
        </div>
        <QuickAddCard
          title="Member"
          endpoint="/api/crm/members"
          accent="emerald"
          description="Add a new Lion or Leo to the roster. They'll receive a welcome email if Resend is configured."
          responseKey="member"
          fields={[
            { name: 'name',  label: 'Full Name',  type: 'text',  required: true,  placeholder: 'Lion Firstname Lastname' },
            { name: 'email', label: 'Email',      type: 'email', required: true,  placeholder: 'name@email.com' },
            { name: 'phone', label: 'Phone',      type: 'tel',   placeholder: '+91…' },
            { name: 'whatsapp', label: 'WhatsApp', type: 'tel',  placeholder: '+91…' },
            { name: 'role', label: 'Role', type: 'select', defaultValue: 'member', options: [
              { value: 'member', label: 'Member' },
              { value: 'officer', label: 'Officer' },
              { value: 'treasurer', label: 'Treasurer' },
              { value: 'secretary', label: 'Secretary' },
              { value: 'president', label: 'President' },
              { value: 'admin', label: 'Admin' },
            ] },
            { name: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: [
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'lapsed', label: 'Lapsed' },
              { value: 'suspended', label: 'Suspended' },
            ] },
            { name: 'club_id', label: 'Club', type: 'select',
              options: (clubs ?? []).map((c) => ({ value: c.id, label: c.name })) },
            { name: 'birthday', label: 'Birthday', type: 'date' },
            { name: 'lions_member_id', label: 'Lions Member ID', type: 'text', hint: 'Optional LCI ID' },
          ]}
        />
      </div>

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
