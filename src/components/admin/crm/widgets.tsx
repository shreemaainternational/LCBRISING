import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* KPI tile — CRM-dashboard style: label, big tabular number, context. */
/* ------------------------------------------------------------------ */
export function KpiCard({
  icon: Icon, label, value, sub, href, tone = 'navy',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: 'navy' | 'gold' | 'green' | 'rose';
}) {
  const toneCls = {
    navy: 'bg-navy-500/10 text-navy-700',
    gold: 'bg-brand-400/20 text-brand-800',
    green: 'bg-emerald-500/10 text-emerald-700',
    rose: 'bg-rose-500/10 text-rose-700',
  }[tone];

  const body = (
    <div className="crm-panel p-4 h-full flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="crm-eyebrow">{label}</span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${toneCls}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="text-2xl font-bold crm-num tracking-tight">{value}</div>
      {sub && <div className="text-xs text-[var(--crm-muted)]">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

/* ------------------------------------------------------------------ */
/* Workflow pipeline — NGO lifecycle view. Each stage is a real count  */
/* from the DB and links to the list filtered to that stage.           */
/* ------------------------------------------------------------------ */
export type PipelineStage = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: 'slate' | 'amber' | 'orange' | 'green' | 'red';
  hint?: string;
};

const STAGE_TONE: Record<PipelineStage['tone'], { bar: string; dot: string }> = {
  slate:  { bar: 'bg-slate-300',   dot: 'bg-slate-400' },
  amber:  { bar: 'bg-amber-400',   dot: 'bg-amber-500' },
  orange: { bar: 'bg-orange-400',  dot: 'bg-orange-500' },
  green:  { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  red:    { bar: 'bg-rose-400',    dot: 'bg-rose-500' },
};

export function WorkflowPipeline({ title, stages, footer }: {
  title: string;
  stages: PipelineStage[];
  footer?: React.ReactNode;
}) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  return (
    <section className="crm-panel p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-[var(--crm-muted)] crm-num">{total} total</span>
      </div>

      {/* Proportional bar — empty stages collapse, so no fake segments. */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 mb-4" aria-hidden>
        {total > 0 && stages.map((s) => s.count > 0 && (
          <div key={s.key} className={STAGE_TONE[s.tone].bar} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stages.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="group block rounded-lg border border-[var(--crm-border)] p-3 hover:border-navy-500/40 hover:bg-slate-50"
            >
              <div className="flex items-center gap-1.5 text-xs text-[var(--crm-muted)]">
                <span className={`h-2 w-2 rounded-full ${STAGE_TONE[s.tone].dot}`} />
                {s.label}
              </div>
              <div className="mt-1 text-xl font-bold crm-num">{s.count}</div>
              {s.hint && <div className="text-[11px] text-[var(--crm-muted)] mt-0.5">{s.hint}</div>}
            </Link>
          </li>
        ))}
      </ol>
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Action queue — "what needs a human today". Zero items = all clear,  */
/* shown explicitly rather than hiding the panel.                      */
/* ------------------------------------------------------------------ */
export type QueueItem = { label: string; count: number; href: string; detail?: string };

export function ActionQueue({ items }: { items: QueueItem[] }) {
  const open = items.filter((i) => i.count > 0);
  return (
    <section className="crm-panel p-5 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">Needs action</h2>
        <span className="crm-eyebrow">{open.length ? `${open.length} open` : 'All clear'}</span>
      </div>
      {open.length === 0 ? (
        <p className="text-sm text-[var(--crm-muted)] py-6 text-center">Nothing waiting on you.</p>
      ) : (
        <ul className="divide-y divide-[var(--crm-border)]">
          {open.map((i) => (
            <li key={i.label}>
              <Link href={i.href} className="flex items-center gap-3 py-2.5 group">
                <span className="min-w-8 h-7 px-2 rounded-md bg-amber-100 text-amber-800 text-xs font-bold crm-num flex items-center justify-center">
                  {i.count}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{i.label}</span>
                  {i.detail && <span className="block text-xs text-[var(--crm-muted)] truncate">{i.detail}</span>}
                </span>
                <ArrowRight size={14} className="text-[var(--crm-muted)] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
