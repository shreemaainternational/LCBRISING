/**
 * Pure helpers for the activities "by month & year" archive — no Supabase
 * or `next/headers` imports, so this is safe to import from client
 * components (PublicNav) as well as server code (lib/activities.ts).
 */
export type ActivityArchiveMonth = { year: number; month: number; count: number };

/** "September 2026" for a 1-12 month number. */
export function archiveMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
