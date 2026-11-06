/**
 * Lions Report Validator — the gate between a logged service activity and
 * "ready to file on the Lions Portal". Pure/deterministic: no I/O beyond the
 * duplicate lookup, so it can run on every activity-detail render.
 *
 * State machine (see migration 0080_lions_report_submission.sql):
 *   not_submitted -> validated -> ready -> submitted
 */
import { createAdminClient } from '@/lib/supabase/server';
import { CAUSE_CATEGORIES_SET } from '@/lib/activity-categories';

export interface LionsActivityInput {
  id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  date: string;
  beneficiaries: number | null;
  lion_members_count: number | null;
  service_hours: number | null;
  expenses: number | null;
  lions_status?: string | null;
  lions_report_id?: string | null;
}

export type LionsChecklistKey =
  | 'date'
  | 'cause'
  | 'activity_type'
  | 'beneficiaries'
  | 'lion_participants'
  | 'lion_hours'
  | 'expenses'
  | 'description';

export interface LionsChecklistItem {
  key: LionsChecklistKey;
  label: string;
  ok: boolean;
  hint: string;
}

export interface LionsValidation {
  items: LionsChecklistItem[];
  allOk: boolean;
}

/** Meetings/events aren't Lions "service activities" — the portal has no field for them. */
const NON_SERVICE_CATEGORIES = new Set(['meeting', 'leadership_program', 'event']);

export function validateActivityForLionsReport(a: LionsActivityInput): LionsValidation {
  const items: LionsChecklistItem[] = [
    {
      key: 'date',
      label: 'Date',
      ok: !!a.date,
      hint: a.date ? 'Set' : 'Activity date is required.',
    },
    {
      key: 'cause',
      label: 'Cause',
      ok: !!a.category && CAUSE_CATEGORIES_SET.has(a.category),
      hint: a.category && CAUSE_CATEGORIES_SET.has(a.category)
        ? 'Set'
        : 'Pick a Lions global cause (Vision, Hunger, Environment, …), not Meeting/Event/Other.',
    },
    {
      key: 'activity_type',
      label: 'Activity Type',
      ok: !!a.category && !NON_SERVICE_CATEGORIES.has(a.category),
      hint: a.category && !NON_SERVICE_CATEGORIES.has(a.category)
        ? 'Set'
        : 'Only service activities can be filed on the Lions Portal — meetings and events are not reportable.',
    },
    {
      key: 'beneficiaries',
      label: 'Beneficiaries',
      ok: Number(a.beneficiaries) > 0,
      hint: Number(a.beneficiaries) > 0 ? 'Set' : 'People served must be greater than zero.',
    },
    {
      key: 'lion_participants',
      label: 'Lions Participants',
      ok: Number(a.lion_members_count) > 0,
      hint: Number(a.lion_members_count) > 0 ? 'Set' : 'At least one Lion member must be recorded as a participant.',
    },
    {
      key: 'lion_hours',
      label: 'Lion Hours',
      ok: Number(a.service_hours) > 0,
      hint: Number(a.service_hours) > 0 ? 'Set' : 'Total volunteer hours must be greater than zero.',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      ok: Number.isFinite(Number(a.expenses)) && Number(a.expenses) >= 0,
      hint: 'Set (₹0 is valid — record what was actually spent).',
    },
    {
      key: 'description',
      label: 'Description',
      ok: (a.description ?? '').trim().length >= 40,
      hint: (a.description ?? '').trim().length >= 40
        ? 'Set'
        : 'Add at least a couple of sentences describing what happened — the humanizer needs real material to work with.',
    },
  ];
  return { items, allOk: items.every((i) => i.ok) };
}

export interface LionsDuplicateMatch {
  source: 'already_submitted' | 'reconciled_import' | 'similar_open_activity';
  activityId: string;
  title: string;
  date: string;
  lionsReportId: string | null;
}

/**
 * Check whether this activity has already been reported to the Lions
 * Portal — either recorded directly in the CRM, discovered via a later
 * Lions-Portal CSV reconciliation import (`service_activities`), or a
 * near-duplicate (same club/title/date) that was already submitted.
 * Called before allowing "Ready for Lions Portal" and again before
 * "Submit", so a race between two officers can't double-file the same
 * activity.
 */
export async function findLionsDuplicate(activity: LionsActivityInput): Promise<LionsDuplicateMatch | null> {
  const db = createAdminClient();

  if (activity.lions_status === 'submitted' && activity.lions_report_id) {
    return {
      source: 'already_submitted',
      activityId: activity.id,
      title: activity.title,
      date: activity.date,
      lionsReportId: activity.lions_report_id,
    };
  }

  // A Lions-Portal export was imported and reconciled back to this exact row.
  const { data: reconciled } = await db
    .from('service_activities')
    .select('service_activity_id, title, end_date')
    .eq('activity_id', activity.id)
    .maybeSingle();
  if (reconciled) {
    return {
      source: 'reconciled_import',
      activityId: activity.id,
      title: (reconciled.title as string) ?? activity.title,
      date: (reconciled.end_date as string) ?? activity.date,
      lionsReportId: (reconciled.service_activity_id as string | null) ?? null,
    };
  }

  // A different activity row, same club/title/date, already submitted —
  // most likely this one was logged twice.
  if (activity.club_id) {
    const { data: similar } = await db
      .from('activities')
      .select('id, title, date, lions_report_id')
      .neq('id', activity.id)
      .eq('club_id', activity.club_id)
      .eq('date', activity.date)
      .eq('lions_status', 'submitted')
      .ilike('title', activity.title)
      .limit(1)
      .maybeSingle();
    if (similar) {
      return {
        source: 'similar_open_activity',
        activityId: similar.id as string,
        title: similar.title as string,
        date: similar.date as string,
        lionsReportId: (similar.lions_report_id as string | null) ?? null,
      };
    }
  }

  return null;
}
