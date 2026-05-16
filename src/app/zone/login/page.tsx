import Link from 'next/link';
import { Shield } from 'lucide-react';
import { ZoneLoginForm } from './ZoneLoginForm';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ denied?: string; redirectTo?: string }>; }

export default async function ZoneLoginPage({ searchParams }: Props) {
  const { denied } = await searchParams;
  const reason =
    denied === 'role'     ? 'Your account does not have Zone Chairperson access.' :
    denied === 'no_zone'  ? 'No zone is mapped to your account yet. Ask the District admin to assign you.' :
    null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-900 via-blue-900 to-emerald-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-3">
            <Shield size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Zone Control</h1>
          <p className="text-blue-100 text-sm mt-1">Lions International · Zone Chairperson Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy-800">Sign in to your zone</h2>
          <p className="text-sm text-gray-500 mb-5">Use your Lion email to access the chairperson dashboard.</p>

          {reason && (
            <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {reason}
            </div>
          )}

          <ZoneLoginForm />

          <div className="mt-5 text-xs text-gray-500 text-center">
            Forgot password? <Link href="/login?reset=1" className="text-amber-600 hover:text-amber-800 underline">Reset here</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-blue-100/80">
          For admins → <Link href="/admin" className="underline">CRM</Link>
          {' · '}
          For members → <Link href="/portal" className="underline">Member Portal</Link>
        </p>
      </div>
    </main>
  );
}
