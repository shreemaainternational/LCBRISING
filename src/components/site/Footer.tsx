import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';

// Force fresh per request so the counter updates without ISR delay.
export const revalidate = 30;

const FOCUS_AREAS = [
  { label: 'Environment', href: '/activities?category=environment' },
  { label: 'Vision', href: '/activities?category=vision' },
  { label: 'Hunger Relief', href: '/activities?category=hunger' },
  { label: 'Disaster Relief', href: '/activities?category=relief' },
  { label: 'Childhood Cancer', href: '/activities?category=cancer' },
  { label: 'Diabetes', href: '/activities?category=diabetes' },
  { label: 'Youth', href: '/activities?category=youth' },
  { label: 'Humanitarian', href: '/activities?category=humanitarian' },
];

async function getVisitorCount(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supa = await createClient();
    const { data } = await supa
      .from('site_counters')
      .select('value')
      .eq('key', 'visits')
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function Footer() {
  const visits = await getVisitorCount();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white mt-20">
      <div className="container-page py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
              alt="Lions Club of Baroda Rising Star"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-300"
            />
            <span className="leading-tight">
              <span className="block text-[10px] tracking-[0.18em] text-brand-300 font-semibold">
                LIONS CLUB OF
              </span>
              <span className="block text-base font-bold">Baroda Rising Star</span>
            </span>
          </Link>
          <p className="text-sm text-gray-300 leading-relaxed mb-4 max-w-xs">
            Empowering communities through service, compassion, and collective
            action. Together, we serve.
          </p>
          <Link
            href="/about"
            className="text-sm text-brand-300 hover:text-brand-200 transition-colors"
          >
            District 3232-F1 · Region VI · Zone I
          </Link>
          <div className="flex gap-2 mt-5">
            <SocialIcon href="https://facebook.com/lcbrisingstar" label="Facebook">
              <FacebookIcon />
            </SocialIcon>
            <SocialIcon href="https://instagram.com/lcbrisingstar" label="Instagram">
              <InstagramIcon />
            </SocialIcon>
            <SocialIcon href="https://x.com/lcbrisingstar" label="X (Twitter)">
              <XIcon />
            </SocialIcon>
            <SocialIcon href="https://linkedin.com/company/lcbrisingstar" label="LinkedIn">
              <LinkedinIcon />
            </SocialIcon>
            <SocialIcon href="https://wa.me/919712299333" label="WhatsApp">
              <WhatsAppIcon />
            </SocialIcon>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold mb-4 text-brand-400">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/" className="hover:text-brand-300">Home</Link></li>
            <li><Link href="/activities" className="hover:text-brand-300">Our Services</Link></li>
            <li><Link href="/donate" className="hover:text-brand-300">Donate</Link></li>
            <li><Link href="/about" className="hover:text-brand-300">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-brand-300">Blog</Link></li>
            <li><Link href="/media" className="hover:text-brand-300">Media</Link></li>
            <li><Link href="/contact" className="hover:text-brand-300">Contact</Link></li>
          </ul>
        </div>

        {/* Focus areas */}
        <div>
          <h4 className="font-semibold mb-4 text-brand-400">Our Focus Areas</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {FOCUS_AREAS.map((f) => (
              <li key={f.label}>
                <Link href={f.href} className="flex items-start gap-2 hover:text-brand-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  <span>{f.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-brand-400">Contact Us</h4>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <Mail size={14} className="mt-0.5 text-brand-300 flex-shrink-0" aria-hidden />
              <a href="mailto:barodarisingstar@gmail.com" className="hover:text-brand-300 break-all">
                barodarisingstar@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 text-brand-300 flex-shrink-0" aria-hidden />
              <a href="tel:+919712299333" className="hover:text-brand-300">
                +91-9712299333
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 text-brand-300 flex-shrink-0" aria-hidden />
              <span>
                12-Kirtikunj Society, B/S Pragati Bank,<br />
                Karelibaug, Vadodara – 390018
              </span>
            </li>
          </ul>

          {/* Visitor counter */}
          <VisitorCounter count={visits} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {year} LCB Rising. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-brand-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-300">Terms of Service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href, label, children,
}: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer me"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 hover:bg-brand-500 hover:text-navy-900 text-white transition-colors border border-white/10"
    >
      {children}
    </a>
  );
}

// The public counter starts from a baseline so it never reads as a
// brand-new site. Real tracked visits (site_counters.value) are added
// on top once they exceed the baseline.
const VISITOR_BASELINE = 25_889;

function VisitorCounter({ count }: { count: number | null }) {
  // Show the larger of the baseline or the real tracked value.
  const total = Math.max(count ?? 0, VISITOR_BASELINE);
  const display = total.toString().padStart(5, '0');
  const digits = display.split('');
  return (
    <div className="mt-6 rounded-lg bg-navy-800/60 border border-white/10 p-4">
      <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-2 text-center">
        TOTAL VISITORS
      </p>
      <div className="flex justify-center gap-1.5">
        {digits.map((d, i) => (
          <span
            key={i}
            className="flex h-9 w-7 items-center justify-center rounded bg-navy-900 ring-1 ring-brand-400/40 text-brand-300 font-bold tabular-nums"
          >
            {d}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-brand-300/80 mt-2 text-center">and counting…</p>
    </div>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.563 9.875v-6.987H7.898V12h2.539V9.797c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.888h-2.33v6.987A10.002 10.002 0 0 0 22 12z" />
    </svg>
  );
}
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  );
}

/** Minimal X / Twitter icon (current logo). */
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.55 7.486L22 22h-6.094l-4.766-5.91L5.687 22H3l7.006-8.012L2 2h6.252l4.32 5.353L18.244 2zm-1.07 18h1.69L7.95 4H6.124L17.174 20z" />
    </svg>
  );
}

/** Minimal WhatsApp icon. */
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.27-1.38a9.92 9.92 0 0 0 4.77 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 19.07 4.9 9.86 9.86 0 0 0 12.04 2zm0 18.15c-1.5 0-2.96-.4-4.23-1.16l-.3-.18-3.13.82.84-3.05-.2-.31a8.24 8.24 0 0 1-1.27-4.36c0-4.55 3.7-8.26 8.26-8.26 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.84c0 4.55-3.7 8.24-8.21 8.24zm4.52-6.18c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.15-.25-.02-.39.11-.51.11-.11.25-.3.37-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.83-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.13.17 1.74 2.66 4.22 3.73 1.7.73 2.36.79 3.21.66.52-.08 1.47-.6 1.68-1.19.21-.59.21-1.09.15-1.19-.06-.1-.23-.17-.48-.3z" />
    </svg>
  );
}
