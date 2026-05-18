import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/portal-session';
import { PortalLoginForm } from './PortalLoginForm';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Portal sign-in',
  description: 'Sign in to view your invoices.',
  robots: { index: false, follow: false },
};

export default async function PortalLoginPage() {
  const session = await getPortalSession();
  if (session) redirect('/portal');

  return (
    <div className="relative min-h-[70vh] bg-gradient-to-br from-[#1a0f3e] via-[#3b1a78] to-[#5b21b6] py-12 px-4 overflow-hidden">
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
            <div className="text-xs uppercase tracking-widest opacity-80">Customer portal</div>
            <h1 className="mt-1 text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm opacity-90">
              We&apos;ll send a 6-digit code to your WhatsApp.
            </p>
          </header>
          <div className="p-6">
            <PortalLoginForm />
          </div>
          <footer className="border-t bg-gray-50 p-4 text-center text-xs text-gray-500">
            Lions Club of Baroda Rising Star
          </footer>
        </div>
      </div>
    </div>
  );
}
