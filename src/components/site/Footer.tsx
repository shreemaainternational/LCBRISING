import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-navy-900 text-white mt-20">
      <div className="container-page py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-3 mb-3">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-brand-400 to-brand-600 text-navy-900 ring-2 ring-brand-300"
              style={{ fontSize: 22, lineHeight: 1 }}
            >
              🦁
            </span>
            <span className="leading-tight">
              <span className="block text-[10px] tracking-[0.18em] text-brand-300 font-semibold">
                LIONS CLUB OF
              </span>
              <span className="block text-base font-bold">Baroda Rising Star</span>
            </span>
          </Link>
          <p className="text-sm text-gray-300 mb-2">
            District 3232-F1 · Region VI · Zone I
          </p>
          <p className="text-sm text-gray-400">Vadodara, Gujarat, India</p>
          <p className="text-sm text-brand-300 mt-3 font-semibold">We Serve.</p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="font-semibold mb-3 text-white">Explore</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/about" className="hover:text-brand-300">About</Link></li>
            <li><Link href="/activities" className="hover:text-brand-300">Service Activities</Link></li>
            <li><Link href="/events" className="hover:text-brand-300">Events</Link></li>
            <li><Link href="/blog" className="hover:text-brand-300">Blog</Link></li>
            <li><Link href="/media" className="hover:text-brand-300">Media</Link></li>
            <li><Link href="/contact" className="hover:text-brand-300">Contact</Link></li>
          </ul>
        </div>

        {/* Get involved */}
        <div>
          <h4 className="font-semibold mb-3 text-white">Get Involved</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/donate" className="hover:text-brand-300">Donate</Link></li>
            <li><Link href="/contact" className="hover:text-brand-300">Become a Member</Link></li>
            <li><Link href="/admin" className="hover:text-brand-300">Member Portal</Link></li>
            <li><Link href="/portal" className="hover:text-brand-300">Customer Portal</Link></li>
            <li><Link href="/invoices/lookup" className="hover:text-brand-300">Pay an Invoice</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-3 text-white">Contact</h4>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 text-brand-300" aria-hidden />
              <a href="tel:+919712299333" className="hover:text-brand-300">
                +91-9712299333
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail size={14} className="mt-0.5 text-brand-300" aria-hidden />
              <a href="mailto:contact@lcbrising.org" className="hover:text-brand-300">
                contact@lcbrising.org
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 text-brand-300" aria-hidden />
              <span>Vadodara, Gujarat 390001, India</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Lions Club of Baroda Rising Star ·
        Chartered under Lions Clubs International ·
        All rights reserved.
      </div>
    </footer>
  );
}
