'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ChevronDown,
  Menu,
  Phone,
  X,
  Leaf,
  Eye,
  Utensils,
  Shield,
  Ribbon,
  Droplet,
  Users,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { env } from '@/lib/env';

type NavItem = {
  href: string;
  label: string;
  hasDropdown?: boolean;
};

type Cause = {
  href: string;
  label: string;
  icon: typeof Leaf;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/activities', label: 'Service Activities', hasDropdown: true },
  { href: '/events', label: 'Events' },
  { href: '/blog', label: 'Blog' },
  { href: '/media', label: 'Media' },
  { href: '/contact', label: 'Contact' },
];

const CAUSES: Cause[] = [
  { href: '/activities#environment', label: 'Environment', icon: Leaf },
  { href: '/activities#vision', label: 'Vision', icon: Eye },
  { href: '/activities#hunger', label: 'Hunger Relief', icon: Utensils },
  { href: '/activities#relief', label: 'Disaster Relief', icon: Shield },
  { href: '/activities#cancer', label: 'Childhood Cancer', icon: Ribbon },
  { href: '/activities#diabetes', label: 'Diabetes', icon: Droplet },
  { href: '/activities#youth', label: 'Youth', icon: Users },
  { href: '/activities#humanitarian', label: 'Humanitarian', icon: Heart },
];

const DISTRICT_LINE = 'District 3232-F1  |  Region V  |  Zone I';
const CONTACT_PHONE = '+91-9712299333';

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="bg-navy-900 text-white/90 text-xs">
        <div className="container-page flex h-8 items-center justify-between gap-4">
          <Link href="/about" className="hover:text-brand-300 transition-colors truncate">
            {DISTRICT_LINE}
          </Link>
          <a
            href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, '')}`}
            className="flex items-center gap-1.5 hover:text-brand-300 transition-colors"
          >
            <Phone size={12} aria-hidden />
            <span>{CONTACT_PHONE}</span>
          </a>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-navy-800 text-white">
        <div className="container-page flex h-20 items-center justify-between gap-4">
          {/* Logo + brand */}
          <Link href="/" className="flex items-center gap-3 group" aria-label="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
              alt="Lions Club of Baroda Rising Star"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-300 shadow-md"
            />
            <span className="leading-tight text-center">
              <span className="block text-[10px] tracking-[0.18em] text-brand-300 font-semibold">
                LIONS CLUB OF
              </span>
              <span className="block text-lg sm:text-xl font-bold text-white">
                Baroda Rising Star
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {NAV.map((item) =>
              item.hasDropdown ? (
                <ServiceActivitiesDropdown
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors ${
                    isActive(item.href)
                      ? 'text-brand-400'
                      : 'text-white/90 hover:text-brand-300'
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/donate"
              className="btn-gold inline-flex items-center rounded-md px-4 py-2 text-sm"
            >
              Donate
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/30 hover:bg-white/10 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Admin
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-white"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-navy-800 text-white border-t border-white/10">
          <div className="container-page py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`block py-2 text-sm font-medium ${
                    isActive(item.href) ? 'text-brand-400' : 'text-white'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
                {item.hasDropdown && (
                  <div className="ml-3 mb-2 grid grid-cols-2 gap-1">
                    {CAUSES.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="flex items-center gap-2 py-1.5 text-xs text-white/70 hover:text-brand-300"
                        onClick={() => setOpen(false)}
                      >
                        <c.icon size={14} className="text-brand-400" aria-hidden />
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <Link
                href="/donate"
                className="btn-gold flex-1 text-center rounded-md px-4 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                Donate
              </Link>
              <Link
                href="/admin"
                className="flex-1 text-center rounded-md border border-white/30 hover:bg-white/10 text-white px-4 py-2 text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                Admin →
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function ServiceActivitiesDropdown({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <div className="relative group">
      <Link
        href={item.href}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? 'text-brand-400' : 'text-white/90 group-hover:text-brand-300'
        }`}
      >
        {item.label}
        <ChevronDown
          size={14}
          className="opacity-80 transition-transform group-hover:rotate-180"
        />
      </Link>
      <div className="absolute left-0 top-full pt-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
        <div className="bg-navy-800 text-white rounded-lg shadow-xl border border-white/10 w-[260px] overflow-hidden">
          <div className="px-4 pt-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-brand-300">
            LIONS GLOBAL CAUSES
          </div>
          <div className="pb-2">
            {CAUSES.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="flex items-center gap-3 px-4 py-2 text-sm text-white/90 hover:bg-white/10 hover:text-brand-300 transition-colors"
              >
                <c.icon size={16} className="text-brand-400" aria-hidden />
                {c.label}
              </Link>
            ))}
          </div>
          <Link
            href="/activities"
            className="flex items-center justify-center gap-1.5 border-t border-white/10 px-4 py-3 text-sm font-semibold text-brand-300 hover:bg-white/5"
          >
            View All Activities
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
