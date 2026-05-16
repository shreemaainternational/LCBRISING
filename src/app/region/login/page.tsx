import Link from 'next/link';
import { Shield } from 'lucide-react';
import { ZoneLoginForm } from '@/app/zone/login/ZoneLoginForm';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ denied?: string }>; }

export default async function RegionLoginPage({ searchParams }: Props) {
  const { denied } = await searchParams;
  const reason =
    denied === 'role'      ? 'Your account does not have Region Chairperson access.' :
    denied === 'no_region' ? 'No region is mapped to your account yet. Ask the District admin to assign you.' :
    null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-navy-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-3">
            <Shield size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Region Control</h1>
          <p className="text-blue-100 text-sm mt-1">Lions International · Region Chairperson Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy-800">Sign in to your region</h2>
          <p className="text-sm text-gray-500 mb-5">Multi-zone control panel for region-level oversight.</p>

          {reason && (
            <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {reason}
            </div>
          )}

          <ZoneLoginForm redirectTo="/region" />
        </div>

        <p className="mt-6 text-center text-xs text-blue-100/80">
          Zone Chair → <Link href="/zone/login" className="underline">/zone/login</Link>
          {' · '}
          Admin → <Link href="/admin" className="underline">/admin</Link>
        </p>
      </div>
    </main>
  );
}
