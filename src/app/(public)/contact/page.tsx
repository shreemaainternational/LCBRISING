import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, ExternalLink } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = { title: 'Contact' };

const ADDRESS = '12-Kirtikunj Society, B/S Pragati Bank, Karelibaug, Vadodara - 390018';
const MAP_QUERY = encodeURIComponent(ADDRESS);

export default function ContactPage() {
  return (
    <>
      <PageHero
        headline="Contact Us"
        subtitle="Have questions, want to volunteer, or need to reach our team? We would love to hear from you."
        backgroundImage={PAGE_HERO_BG.contact}
      />

      <section className="container-page py-16 md:py-20">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* Form */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-navy-800 mb-6">
              Send Us a Message
            </h2>
            <ContactForm />
          </div>

          {/* Contact details */}
          <div>
            <h2 className="text-2xl font-bold text-navy-800 mb-6">
              Get in Touch
            </h2>
            <div className="space-y-5">
              <InfoRow icon={Mail} title="Email">
                <a
                  href="mailto:barodarisingstar@gmail.com"
                  className="text-navy-800 hover:text-brand-600 break-all"
                >
                  barodarisingstar@gmail.com
                </a>
                <p className="text-sm text-gray-500">We respond within 24 hours</p>
              </InfoRow>
              <InfoRow icon={Phone} title="Phone">
                <a
                  href="tel:+919712299333"
                  className="text-navy-800 hover:text-brand-600"
                >
                  +91-9712299333
                </a>
                <p className="text-sm text-gray-500">Mon-Fri, 10AM - 5PM</p>
              </InfoRow>
              <InfoRow icon={MapPin} title="Address">
                <p className="text-navy-800">
                  12-Kirtikunj Society, Karelibaug
                </p>
                <p className="text-sm text-gray-500">Baroda - 390018</p>
              </InfoRow>
              <InfoRow icon={Clock} title="Office Hours">
                <p className="text-navy-800">Mon - Fri: 10AM - 5PM</p>
                <p className="text-sm text-gray-500">Sat: 10AM - 2PM</p>
              </InfoRow>
            </div>

            {/* Map */}
            <div className="mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <h3 className="font-bold text-navy-800 mb-3">Visit Us</h3>
              <div className="relative rounded-lg overflow-hidden">
                <iframe
                  title="Map to LCB Rising"
                  src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
                  className="w-full h-56 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white text-navy-700 text-sm font-medium px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Open in Maps
                  <ExternalLink size={14} aria-hidden />
                </a>
              </div>
              <p className="text-sm text-gray-600 mt-3">{ADDRESS}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon size={20} className="text-navy-700" aria-hidden />
      </div>
      <div>
        <div className="font-bold text-navy-800">{title}</div>
        {children}
      </div>
    </div>
  );
}
