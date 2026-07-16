import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { BulkMemberUpload } from '@/components/admin/BulkMemberUpload';
import { MembersTable, type MemberRow } from '@/components/admin/MembersTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { membersPreset } from '@/components/admin/quick-add-presets';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  // Read via the service-role client (this page is inside the admin-gated
  // layout) so the roster query bypasses RLS. The members SELECT policy is
  // self-referential on databases where migration 0059 has not been applied,
  // and once any member row exists that read trips "infinite recursion detected
  // in policy for relation members". Bypassing RLS here keeps the page working.
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const [{ data: members }, { data: clubs }] = await Promise.all([
    supabase.from('members').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('clubs').select('id, name').is('deleted_at', null).order('name'),
  ]);

  const preset = membersPreset({ clubs: clubs ?? [] });
  const clubOptions = clubs ?? [];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Members</h1>
          <p className="text-gray-600">All members across the chapter.</p>
        </div>
        <QuickAddCard title="Member" {...preset} />
      </div>

      <div className="mb-6">
        <BulkMemberUpload clubs={clubOptions} />
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
            <MembersTable members={members as MemberRow[]} clubs={clubOptions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
