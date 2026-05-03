import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-navy-900 text-white mt-20">
      <div className="container-page py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 font-bold mb-3">
            <span className="text-2xl">🦁</span> Lions Club Baroda Rising Star
          </div>
          <p className="text-sm text-gray-300">
            District 323-E · Vadodara, Gujarat · We Serve.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/activities">Activities</Link></li>
            <li><Link href="/events">Events</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Get Involved</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/donate">Donate</Link></li>
            <li><Link href="/contact">Become a Member</Link></li>
            <li><Link href="/admin">Member Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>contact@lcbrising.org</li>
            <li>Vadodara, Gujarat 390001</li>
            <li>India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Lions Club of Baroda Rising Star · All rights reserved.
      </div>
    </footer>
  );
}
