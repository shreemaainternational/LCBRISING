import {
  Leaf,
  Eye,
  Utensils,
  Shield,
  Ribbon,
  Droplet,
  Users,
  Heart,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for the eight Lions Clubs International global
 * cause areas the club serves. Shared by the public navigation dropdown,
 * the /activities overview page, and the per-cause activity pages so the
 * slugs, labels, icons and category mapping never drift apart.
 *
 * `categories` lists the `activities.category` values that belong to a
 * cause. Uploaded activities are filtered cause-wise using this map, so
 * every category option offered in the admin quick-add form must appear in
 * exactly one cause here (Humanitarian is the catch-all for the broader
 * community-service categories).
 */
export type Cause = {
  slug: string;
  title: string;
  icon: LucideIcon;
  tagline: string;
  body: string;
  points: string[];
  categories: string[];
};

export const CAUSES: Cause[] = [
  {
    slug: 'environment',
    icon: Leaf,
    title: 'Environment',
    tagline: 'Protecting the planet for future generations',
    body: 'Protecting our planet through tree plantation drives, cleanup campaigns, and environmental awareness programs. We work to create sustainable communities and preserve natural resources for future generations.',
    points: [
      'Tree plantation drives across Vadodara',
      'River and lake cleanup campaigns',
      'Plastic-free community initiatives',
    ],
    categories: ['environment'],
  },
  {
    slug: 'vision',
    icon: Eye,
    title: 'Vision',
    tagline: 'The global leader in sight preservation',
    body: 'Providing free eye care services including screenings, spectacle distribution, and cataract surgery support. Lions Clubs are the global leader in sight preservation and blindness prevention.',
    points: [
      'Free eye check-up camps',
      'Spectacle distribution for underprivileged',
      'Cataract surgery referrals and support',
    ],
    categories: ['vision'],
  },
  {
    slug: 'hunger',
    icon: Utensils,
    title: 'Hunger Relief',
    tagline: 'No one should go hungry',
    body: 'No one should go hungry. Our hunger relief programs serve thousands of meals through community kitchens, food pantries, and nutrition education to fight food insecurity.',
    points: [
      'Weekly food distribution drives',
      'Community kitchen meals program',
      'Nutrition awareness workshops',
    ],
    categories: ['hunger'],
  },
  {
    slug: 'relief',
    icon: Shield,
    title: 'Disaster Relief',
    tagline: 'First to respond when disaster strikes',
    body: 'When disasters strike, Lions are among the first to respond. We provide immediate relief including food, shelter, medical aid, and long-term rehabilitation support to affected communities.',
    points: [
      'Emergency relief material distribution',
      'Flood and earthquake response teams',
      'Long-term rehabilitation support',
    ],
    categories: ['relief', 'disaster_relief', 'disaster'],
  },
  {
    slug: 'cancer',
    icon: Ribbon,
    title: 'Childhood Cancer',
    tagline: 'Every child deserves a fighting chance',
    body: 'Supporting children and families affected by childhood cancer through financial assistance, awareness campaigns, and emotional support programs. Every child deserves a fighting chance.',
    points: [
      'Financial aid for treatment costs',
      'Cancer awareness and early detection camps',
      'Emotional support for families',
    ],
    categories: ['childhood_cancer', 'cancer'],
  },
  {
    slug: 'diabetes',
    icon: Droplet,
    title: 'Diabetes',
    tagline: 'Preventing and managing the epidemic',
    body: 'Combating the diabetes epidemic through free screening camps, awareness programs, and lifestyle education. We help communities understand, prevent, and manage diabetes effectively.',
    points: [
      'Free diabetes screening camps',
      'Diet and lifestyle counseling',
      'Insulin and medication support',
    ],
    categories: ['diabetes'],
  },
  {
    slug: 'youth',
    icon: Users,
    title: 'Youth',
    tagline: 'Empowering the next generation',
    body: 'Empowering the next generation through mentorship, leadership training, and skill development programs. We invest in youth to build confident, responsible future leaders.',
    points: [
      'Youth leadership workshops',
      'Career guidance and mentorship',
      'Leo Club development programs',
    ],
    categories: ['youth', 'education'],
  },
  {
    slug: 'humanitarian',
    icon: Heart,
    title: 'Humanitarian',
    tagline: 'Uplifting the most vulnerable',
    body: 'Addressing diverse community needs through blood donation drives, senior care, education support, and other humanitarian initiatives that uplift the most vulnerable members of society.',
    points: [
      'Blood donation camps',
      'Senior citizen support programs',
      'Education scholarship initiatives',
    ],
    categories: ['humanitarian', 'healthcare', 'women', 'senior', 'other'],
  },
];

const CAUSE_BY_SLUG: Record<string, Cause> = Object.fromEntries(
  CAUSES.map((c) => [c.slug, c]),
);

const CAUSE_BY_CATEGORY: Record<string, Cause> = Object.fromEntries(
  CAUSES.flatMap((c) => c.categories.map((cat) => [cat, c])),
);

/** Look up a cause by its URL slug. Returns undefined for unknown slugs. */
export function getCause(slug: string): Cause | undefined {
  return CAUSE_BY_SLUG[slug];
}

/**
 * Map an `activities.category` value to its cause. Unknown or null
 * categories fall back to Humanitarian, the catch-all community cause.
 */
export function causeForCategory(category: string | null | undefined): Cause {
  return (
    (category ? CAUSE_BY_CATEGORY[category] : undefined) ??
    CAUSE_BY_SLUG.humanitarian
  );
}

/** All valid cause slugs — used for static params and validation. */
export const CAUSE_SLUGS = CAUSES.map((c) => c.slug);
