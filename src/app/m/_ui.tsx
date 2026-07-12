import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Shared mobile UI kit — the blue/white "District" theme.
 * Presentational only (no client hooks) so it can be used inside
 * server components.
 */

export const M_BLUE = '#1e40af';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </section>
  );
}

export function CardHeading({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <h2 className={`text-lg font-bold text-[#1e40af] ${accent ? 'pt-3' : ''}`}>{children}</h2>
  );
}

export function Avatar({ name, src, size = 72 }: { name: string; src?: string | null; size?: number }) {
  const initial = (name?.trim()?.charAt(0) ?? '?').toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-gray-200 bg-gray-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-blue-50 text-[#1e40af] flex items-center justify-center ring-1 ring-blue-100 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

/** Horizontal scrolling strip of officers/leaders. */
export function LeadershipStrip({
  people,
}: {
  people: { name: string; roleLabel: string; avatar?: string | null }[];
}) {
  if (!people.length) {
    return <p className="text-sm text-gray-400 py-4">Leadership details will appear here soon.</p>;
  }
  return (
    <div className="flex gap-0 overflow-x-auto -mx-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {people.map((p, i) => (
        <div
          key={i}
          className={`flex-none w-1/3 min-w-[110px] px-2 flex flex-col items-center text-center ${
            i > 0 ? 'border-l border-gray-100' : ''
          }`}
        >
          <Avatar name={p.name} src={p.avatar} size={72} />
          <div className="mt-2 font-bold text-sm text-gray-900 leading-tight">{p.name}</div>
          <div className="mt-1 text-xs text-gray-500 leading-tight">{p.roleLabel}</div>
          <div className="mt-2 h-1 w-8 rounded-full bg-[#1e40af]" />
        </div>
      ))}
    </div>
  );
}

/** A small stat tile: icon on top, big value, label under. */
export function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <Icon size={26} className="text-[#1e40af]" />
      <div className="mt-2 text-2xl font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

/** A tappable full-width row: round icon, title, description, chevron. */
export function RowCard({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.99] transition"
    >
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-none">
        <Icon size={22} className="text-[#1e40af]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900">{title}</div>
        <div className="text-sm text-gray-500 leading-snug">{desc}</div>
      </div>
      <ChevronRight size={20} className="text-gray-300 flex-none" />
    </Link>
  );
}

/** A vertical icon + label action (used in the "What We Do?" grid). */
export function IconAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex flex-col items-center text-center gap-2 active:scale-95 transition">
      <Icon size={30} className="text-[#1e40af]" strokeWidth={1.8} />
      <span className="text-sm font-semibold text-gray-800 leading-tight">{label}</span>
    </Link>
  );
}

export const LIONS_ROLE_LABEL: Record<string, string> = {
  international_admin: 'International Admin',
  multiple_district_admin: 'Council Chairperson',
  district_governor: 'District Governor',
  vice_district_governor: 'Vice District Governor',
  cabinet_officer: 'Cabinet Officer',
  region_chairperson: 'Region Chairperson',
  zone_chairperson: 'Zone Chairperson',
  club_president: 'Club President',
  club_secretary: 'Club Secretary',
  club_treasurer: 'Club Treasurer',
  club_officer: 'Club Officer',
  member: 'Member',
  guest_viewer: 'Guest',
};

export function roleLabel(role?: string | null): string {
  if (!role) return 'Officer';
  return LIONS_ROLE_LABEL[role] ?? role.replace(/_/g, ' ');
}
