import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin/profile');

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-navy-800 mb-1">My Profile</h1>
      <p className="text-gray-500 mb-8">
        Your account details and security settings.
      </p>

      {/* Account details */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-navy-800 mb-4">Account</h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium text-navy-800">{member.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-navy-800 break-all">
              {member.email}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium text-navy-800 capitalize">
              {member.role}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium text-navy-800 capitalize">
              {member.status ?? 'active'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Change password */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-navy-800 mb-1">Change Password</h2>
        <p className="text-sm text-gray-500 mb-5">
          Pick a strong password of at least 8 characters.
        </p>
        <ChangePasswordForm email={member.email} />
      </section>
    </div>
  );
}
