import Link from 'next/link';
import { findAction, CATEGORY_META, type CrmAction, type ActionCategory } from '@/lib/crm-action-map';
import { CommandIcon, ChevronRight } from 'lucide-react';

/**
 * Top-of-dashboard quick actions row. Pulls a curated list of the
 * most-used operations from CRM_ACTIONS so every wired button has a
 * single source of truth.
 */
const FEATURED_KEYS = [
  'members.new',
  'fin.donations',
  'act.list',
  'comm.circulars',
  'comm.push',
  'rep.new',
  'sync.dashboard',
  'gov.console',
];

const CATEGORY_LINKS: ActionCategory[] = [
  'members', 'clubs', 'finance', 'activities',
  'communications', 'reports', 'sync', 'governance',
];

export function QuickActionsBar() {
  const featured = FEATURED_KEYS.map(findAction).filter((a): a is CrmAction => !!a);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-navy-800 uppercase tracking-wider inline-flex items-center gap-1.5">
          <CommandIcon size={14} className="text-amber-500" /> Quick Actions
        </h2>
        <Link href="/admin/operations" className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1">
          Full Command Center <ChevronRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {featured.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.key} href={a.href}
              className="bg-white rounded-lg border shadow-sm p-2.5 hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="flex items-start gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-navy-800 leading-tight">{a.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">{a.description}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_LINKS.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <Link key={cat} href={`/admin/operations?cat=${cat}`}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color} hover:opacity-80`}>
              <Icon size={11} /> {meta.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
