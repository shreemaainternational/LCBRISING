import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Leaf,
  Eye,
  Utensils,
  Shield,
  Ribbon,
  Droplet,
  Users,
  Heart,
} from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Service Activities',
  description:
    'The eight global cause areas Lions Club of Baroda Rising Star serves, as identified by Lions Clubs International.',
};

type Cause = {
  id: string;
  icon: typeof Leaf;
  title: string;
  body: string;
  points: string[];
};

const CAUSES: Cause[] = [
  {
    id: 'environment',
    icon: Leaf,
    title: 'Environment',
    body: 'Protecting our planet through tree plantation drives, cleanup campaigns, and environmental awareness programs. We work to create sustainable communities and preserve natural resources for future generations.',
    points: [
      'Tree plantation drives across Vadodara',
      'River and lake cleanup campaigns',
      'Plastic-free community initiatives',
    ],
  },
  {
    id: 'vision',
    icon: Eye,
    title: 'Vision',
    body: 'Providing free eye care services including screenings, spectacle distribution, and cataract surgery support. Lions Clubs are the global leader in sight preservation and blindness prevention.',
    points: [
      'Free eye check-up camps',
      'Spectacle distribution for underprivileged',
      'Cataract surgery referrals and support',
    ],
  },
  {
    id: 'hunger',
    icon: Utensils,
    title: 'Hunger Relief',
    body: 'No one should go hungry. Our hunger relief programs serve thousands of meals through community kitchens, food pantries, and nutrition education to fight food insecurity.',
    points: [
      'Weekly food distribution drives',
      'Community kitchen meals program',
      'Nutrition awareness workshops',
    ],
  },
  {
    id: 'relief',
    icon: Shield,
    title: 'Disaster Relief',
    body: 'When disasters strike, Lions are among the first to respond. We provide immediate relief including food, shelter, medical aid, and long-term rehabilitation support to affected communities.',
    points: [
      'Emergency relief material distribution',
      'Flood and earthquake response teams',
      'Long-term rehabilitation support',
    ],
  },
  {
    id: 'cancer',
    icon: Ribbon,
    title: 'Childhood Cancer',
    body: 'Supporting children and families affected by childhood cancer through financial assistance, awareness campaigns, and emotional support programs. Every child deserves a fighting chance.',
    points: [
      'Financial aid for treatment costs',
      'Cancer awareness and early detection camps',
      'Emotional support for families',
    ],
  },
  {
    id: 'diabetes',
    icon: Droplet,
    title: 'Diabetes',
    body: 'Combating the diabetes epidemic through free screening camps, awareness programs, and lifestyle education. We help communities understand, prevent, and manage diabetes effectively.',
    points: [
      'Free diabetes screening camps',
      'Diet and lifestyle counseling',
      'Insulin and medication support',
    ],
  },
  {
    id: 'youth',
    icon: Users,
    title: 'Youth',
    body: 'Empowering the next generation through mentorship, leadership training, and skill development programs. We invest in youth to build confident, responsible future leaders.',
    points: [
      'Youth leadership workshops',
      'Career guidance and mentorship',
      'Leo Club development programs',
    ],
  },
  {
    id: 'humanitarian',
    icon: Heart,
    title: 'Humanitarian',
    body: 'Addressing diverse community needs through blood donation drives, senior care, education support, and other humanitarian initiatives that uplift the most vulnerable members of society.',
    points: [
      'Blood donation camps',
      'Senior citizen support programs',
      'Education scholarship initiatives',
    ],
  },
];

export default function ActivitiesPage() {
  return (
    <>
      <PageHero
        pillText="Lions International Global Causes"
        headline="Our Service Activities"
        subtitle="Lions Club of Baroda Rising Star serves the community through these 8 global cause areas identified by Lions Clubs International."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {/* Cause cards */}
      <section className="container-page py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-7">
          {CAUSES.map((c) => (
            <article
              key={c.id}
              id={c.id}
              className="scroll-mt-28 bg-white border border-gray-200 rounded-2xl p-8 target:ring-2 target:ring-brand-400"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center">
                  <c.icon size={24} className="text-navy-700" aria-hidden />
                </div>
                <h2 className="text-2xl font-bold text-navy-800 pt-1.5">
                  {c.title}
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-5">{c.body}</p>
              <ul className="space-y-2">
                {c.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0"
                      aria-hidden
                    />
                    <span className="text-navy-800">{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-4">
            Want to Get Involved?
          </h2>
          <p className="text-gray-600 mb-8">
            We are always looking for dedicated volunteers to help deliver our
            programs. No experience necessary — just a willingness to serve.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="btn-navy inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Volunteer With Us
            </Link>
            <Link
              href="/donate"
              className="btn-gold inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Support Our Programs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
