import type { Metadata } from 'next';
import Link from 'next/link';
import { Target, Eye, Heart, Users, Award, Calendar } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about the Lions Club of Baroda Rising Star, our mission, leadership, and history.',
  alternates: { canonical: '/about' },
};

const STATS = [
  { value: '92+', label: 'Members' },
  { value: '81+', label: 'Active' },
  { value: '48+', label: 'Activities' },
  { value: '2,300+', label: 'Vol. Hours' },
  { value: '6,400+', label: 'Beneficiaries' },
  { value: '₹9.3L+', label: 'Funds Raised' },
];

const VALUES = [
  {
    icon: Heart,
    title: 'Love',
    body: 'Every action is rooted in genuine care for the people we serve.',
  },
  {
    icon: Users,
    title: 'Community',
    body: 'We believe in the power of collective action and shared responsibility.',
  },
  {
    icon: Award,
    title: 'Excellence',
    body: 'We hold ourselves to the highest standards of service and stewardship.',
  },
  {
    icon: Calendar,
    title: 'Consistency',
    body: 'Communities rely on us. We show up, every day, rain or shine.',
  },
];

const JOURNEY = [
  {
    year: '2020',
    body: 'Lions Club of Baroda Rising Star chartered with founding members',
  },
  {
    year: '2025',
    body: 'Serving the Vadodara community with 92+ active members across 2 clubs',
  },
  {
    year: '2026',
    body: '48+ service activities completed, 6,400+ lives impacted, ₹9.3L+ funds raised',
  },
];

const LEADERS = [
  {
    name: 'Lion Hiren Rathod',
    role: 'Club President',
    body: 'Leading Lions Club of Baroda Rising Star with vision and dedication, driving impactful community service across all Lions causes.',
  },
  {
    name: 'Lion TBD',
    role: 'Club Secretary',
    body: 'Ensuring smooth operations and coordination of all club activities, meetings, and communications with District and Zone.',
  },
  {
    name: 'Lion TBD',
    role: 'Club Treasurer',
    body: 'Managing club finances with transparency, overseeing donations, dues, and ensuring proper fund utilization for service activities.',
  },
];

function avatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name.replace(/^Lion\s+/, ''),
  )}&background=172554&color=fbbf24&size=160&bold=true`;
}

export default function AboutPage() {
  return (
    <>
      <PageHero
        headline="About Lions Club of Baroda Rising Star"
        subtitle="A story of community, compassion, and the unwavering belief that together, we can create lasting change."
        backgroundImage={PAGE_HERO_BG.about}
      />

      {/* Mission & Vision */}
      <section className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-7">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
              <Target size={24} className="text-navy-700" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-navy-800 mb-3">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              To empower underserved communities through comprehensive service
              programs that address immediate needs while building long-term
              resilience, self-sufficiency, and hope.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
              <Eye size={24} className="text-navy-700" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-navy-800 mb-3">Our Vision</h2>
            <p className="text-gray-600 leading-relaxed">
              A world where every person has access to the resources,
              opportunities, and support they need to live with dignity and
              achieve their full potential.
            </p>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-navy-900 text-white">
        <div className="container-page py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold text-brand-400">
                {s.value}
              </div>
              <div className="text-sm text-gray-300 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-6">
            Our Story
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Lions Club of Baroda Rising Star was chartered in 2020 as part of
            Lions Clubs International — the world&apos;s largest service club
            organization. Founded by a dedicated group of Lions who saw the need
            for community service in Vadodara, we began serving through
            healthcare camps, eye screenings, and food distribution drives.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="container-page py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-navy-800 text-center mb-12">
          Our Core Values
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {VALUES.map((v) => (
            <div key={v.title} className="text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <v.icon size={26} className="text-navy-700" aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-navy-800 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Journey */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 text-center mb-12">
            Our Journey
          </h2>
          <div className="relative">
            <div
              className="absolute left-6 top-0 bottom-0 w-0.5 bg-navy-700/40"
              aria-hidden
            />
            <div className="space-y-6">
              {JOURNEY.map((j) => (
                <div key={j.year} className="relative flex gap-5">
                  <div className="relative z-10 h-12 w-12 flex-shrink-0 rounded-full bg-navy-800 text-white text-sm font-bold flex items-center justify-center">
                    {j.year.slice(2)}
                  </div>
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="text-navy-700 font-bold mb-1">{j.year}</div>
                    <p className="text-gray-600 text-sm">{j.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="container-page py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">
            Leadership Team
          </h2>
          <p className="text-gray-600">
            Meet the passionate leaders driving our mission forward.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-7">
          {LEADERS.map((l) => (
            <div
              key={l.name}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar(l.name)}
                alt={l.name}
                className="h-28 w-28 rounded-full object-cover mx-auto mb-5 ring-4 ring-brand-400"
              />
              <h3 className="text-lg font-bold text-navy-800">{l.name}</h3>
              <div className="text-brand-600 font-semibold text-sm mb-3">
                {l.role}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-navy-800 text-white">
        <div className="container-page py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Our Growing Family
          </h2>
          <p className="text-blue-100 max-w-2xl mx-auto mb-8">
            Whether as a volunteer, donor, or advocate, there is a place for you
            at LCB Rising.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="btn-gold inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Get Involved
            </Link>
            <Link
              href="/donate"
              className="inline-flex items-center rounded-md border border-white/50 hover:bg-white/10 text-white font-medium px-6 py-3 text-sm transition-colors"
            >
              Make a Donation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
