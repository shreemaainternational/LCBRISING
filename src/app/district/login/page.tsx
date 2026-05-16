import Link from 'next/link';
import { Shield } from 'lucide-react';
import { ZoneLoginForm } from '@/app/zone/login/ZoneLoginForm';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ denied?: string }>; }

export default async function DistrictLoginPage({ searchParams }: Props) {
  const { denied } = await searchParams;
  const reason =
    denied === 'role'         ? 'Your account does not have District Governor access.' :
    denied === 'no_district'  ? 'No district is mapped to your account yet.' :
    null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-700 via-navy-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-3">
            <Shield size={28} className="text-amber-300" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">District Control</h1>
          <p className="text-blue-100 text-sm mt-1">Lions International · District Governor Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy-800">Sign in to your district</h2>
          <p className="text-sm text-gray-500 mb-5">District-wide governance, region roll-ups and Lions Year oversight.</p>
          {reason && (
            <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{reason}</div>
          )}
          <ZoneLoginForm redirectTo="/district" />
        </div>

        <p className="mt-6 text-center text-xs text-blue-100/80">
          Region → <Link href="/region/login" className="underline">/region</Link> ·
          Zone → <Link href="/zone/login" className="underline">/zone</Link> ·
          Admin → <Link href="/admin" className="underline">/admin</Link>
        </p>
      </div>
    </main>
  );
}
