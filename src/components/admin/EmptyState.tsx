'use client';
import { ReactNode } from 'react';
import { Plus, Sparkles } from 'lucide-react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Pass the same <QuickAddCard … /> here so the empty state has its own working button. */
  cta: ReactNode;
  /** Optional secondary hint (e.g. "Or import via CSV"). */
  hint?: ReactNode;
}

/**
 * Friendly empty state for CRM list pages. Renders a prominent
 * inline call-to-action — typically a QuickAddCard — so users
 * discover the add affordance from anywhere on the page, not just
 * from a small button in the header.
 */
export function EmptyState({ icon, title, description, cta, hint }: Props) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-amber-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-blue-600">
        {icon ?? <Sparkles size={26} />}
      </div>
      <h3 className="text-lg font-bold text-navy-800">{title}</h3>
      {description && <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">{description}</p>}
      <div className="mt-5 inline-flex flex-col items-center gap-3">
        {cta}
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

/**
 * Inline "+ Add" trigger button to anchor calls-to-action that
 * don't use a full QuickAddCard.
 */
export function InlineAddHint({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium">
      <Plus size={14} /> {label}
    </span>
  );
}
