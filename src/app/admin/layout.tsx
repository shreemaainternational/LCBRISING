import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { env } from '@/lib/env';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { AdminSidebarNav, AdminMobileNav } from '@/components/admin/AdminSidebarNav';
import { AdminSearch } from '@/components/admin/AdminSearch';

/**
 * Rising Star CRM shell — the one admin app. CRM-dashboard layout (fixed dark
 * rail, sticky top bar with search + primary action, dense content canvas);
 * the NGO-workflow structure lives in the nav grouping and the dashboard
 * pipeline. Styles come from the `crm-*` utilities in globals.css.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin');

  const initials = member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join('');

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
        alt="Lions International"
        className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-400/40"
      />
      <div className="leading-tight">
        <div className="font-bold tracking-tight">Rising Star CRM</div>
        <div className="text-[11px] text-white/50">LC Baroda Rising Star</div>
      </div>
    </Link>
  );

  const userFooter = (
    <div className="border-t border-white/10 p-4 text-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full bg-brand-400 text-navy-900 text-xs font-bold flex items-center justify-center">
          {initials || '?'}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{member.name}</div>
          <div className="text-xs text-white/50 capitalize">{member.role}</div>
        </div>
      </div>
      <LogoutButton />
    </div>
  );

  return (
    <div className="min-h-screen flex crm-canvas">
      <aside className="crm-sidebar w-64 flex-shrink-0 hidden md:flex flex-col sticky top-0 h-screen">
        {brand}
        <Suspense fallback={<div className="flex-1" />}>
          <AdminSidebarNav />
        </Suspense>
        {userFooter}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--crm-border)] bg-white/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 md:px-8 h-14">
            <Suspense fallback={null}>
              <AdminMobileNav header={brand} footer={userFooter} />
            </Suspense>
            <div className="flex-1 min-w-0">
              <AdminSearch />
            </div>
            <Link
              href="/admin/activities"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg btn-navy px-3 h-9 text-sm"
            >
              <Plus size={15} /> Log activity
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-x-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
