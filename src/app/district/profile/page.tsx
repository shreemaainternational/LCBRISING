import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { ChangePasswordForm } from '@/app/admin/profile/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function DistrictProfilePage() {
  const ctx = await requireDistrictGovernor();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">My Profile</h2>
        <p className="text-gray-600 text-sm mt-1">{ctx.member.name} · {ctx.member.email}</p>
      </div>
      <DistrictTabs />
      <div className="max-w-md bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-semibold text-navy-800 mb-3">Change Password</h3>
        <ChangePasswordForm email={ctx.member.email} />
      </div>
    </div>
  );
}
