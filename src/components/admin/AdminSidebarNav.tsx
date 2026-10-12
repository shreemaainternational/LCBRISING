'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { NAV_SECTIONS, isActive, type NavSection } from './crm/nav';

/**
 * Admin CRM sidebar. Sections come from `crm/nav.ts`; the same config drives
 * the mobile drawer below so the two can't drift apart.
 */
export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin">
      {NAV_SECTIONS.map((s) => (
        <Section key={s.id} section={s} pathname={pathname} search={search} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function Section({
  section, pathname, search, onNavigate,
}: { section: NavSection; pathname: string; search: string; onNavigate?: () => void }) {
  const containsActive = section.items.some((i) => isActive(i.href, pathname, search));
  const [open, setOpen] = useState(!section.collapsible || containsActive);

  return (
    <div>
      {section.collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="crm-nav-heading w-full flex items-center justify-between hover:text-white"
        >
          {section.title}
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="crm-nav-heading">{section.title}</div>
      )}
      {open && (
        <ul className="mt-1.5 space-y-0.5">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, pathname, search);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`crm-nav-link ${active ? 'crm-nav-link-active' : ''}`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Mobile navigation. Before this change the sidebar was `hidden md:flex` with
 * no alternative, so phones had no way to reach admin pages except via search.
 * Closes on route change and on Escape.
 */
export function AdminMobileNav({ header, footer }: { header: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close when the route changes (back button etc.) — derived during render,
  // not in an effect, to avoid a cascading re-render.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-navy-800"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setOpen(false)}
          />
          <aside className="crm-sidebar absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              {header}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <AdminSidebarNav onNavigate={() => setOpen(false)} />
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
