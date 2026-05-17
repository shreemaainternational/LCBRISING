import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/portal-session';
import { getPrefsForPhone } from '@/lib/customer-prefs';
import { PreferencesForm } from './PreferencesForm';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Notification preferences',
  robots: { index: false, follow: false },
};

export default async function PrefsPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');
  const prefs = await getPrefsForPhone(session.phone);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#1a0f3e] via-[#3b1a78] to-[#5b21b6] py-8 px-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1920&q=80&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <header className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] text-white p-6 text-center">
            <div className="text-xs uppercase tracking-widest opacity-80">Portal</div>
            <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
          </header>
          <div className="p-6">
            <PreferencesForm initial={prefs} />
            <div className="mt-4 text-center">
              <a href="/portal" className="text-xs text-purple-700 hover:underline">Back to invoices</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
