import { createAdminClient } from '@/lib/supabase/server';
import { parseCsv } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

/**
 * CSV / Excel → activities adapter.
 *
 * Two input layouts are supported and auto-detected:
 *
 *  1. The Lion Portal "Service Activities Information" export. Its header row
 *     (Title, Cause, People Served, Service Activity ID, …) sits below a title
 *     banner and a filter block, and the file ends with subtotal rows — all of
 *     which are skipped. Every column is preserved verbatim in
 *     `service_activities` and mapped down to a `public.activities` row.
 *
 *  2. A plain template with headers on the first row:
 *       title, description, category, beneficiaries, service_hours,
 *       amount_raised, date, location, club_id
 *     (a handful of friendly aliases are accepted). These import into
 *     `activities` only.
 *
 * Idempotent: `service_activities` is keyed on Service Activity ID (falling
 * back to club_id + title + end_date); `activities` on title + date. Re-runs
 * update the existing rows.
 */

/** Strip everything but a-z0-9 so header matching is punctuation/space-insensitive. */
function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function txt(v: unknown): string {
  return String(v ?? '').trim();
}

/** Numeric cell — tolerates commas, currency symbols and blanks. */
function num(v: unknown): number {
  const s = txt(v);
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Truthy cell — TRUE/1/yes/y. */
function bool(v: unknown): boolean {
  return /^(true|1|yes|y)$/i.test(txt(v));
}

/** Normalize a date cell (M/D/YYYY, YYYY-MM-DD, or Excel serial) → YYYY-MM-DD. */
function toDate(v: unknown): string | null {
  const s = txt(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Excel serial date (days since 1899-12-30).
  if (/^\d{4,6}$/.test(s)) {
    const serial = parseInt(s, 10);
    const ms = (serial - 25569) * 86400 * 1000;
    const dt = new Date(ms);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Map a Lion Portal Cause / Project Type to an app service category. Mirrors
 * the client-side bulk importer and the one-off seed so all paths agree.
 */
function mapCategory(cause: string, title: string, projectType: string): string {
  const c = norm(cause);
  const t = title.toLowerCase();
  const pt = norm(projectType);
  const direct: Record<string, string> = {
    hunger: 'hunger',
    diabetes: 'diabetes',
    environment: 'environment',
    youth: 'youth',
    childhoodcancer: 'childhood_cancer',
    disasterrelief: 'relief',
    vision: 'vision',
    administration: 'other',
  };
  if (direct[c]) return direct[c];
  if (c === 'otherhumanitarianservice') {
    if (/tb\s*kit|t\s*b\s*kit|tb\s*nutrition|blood|health|medical/.test(t) || pt.includes('health') || pt.includes('donation')) {
      return 'healthcare';
    }
    return 'humanitarian';
  }
  return 'other';
}

// Portal export header (normalized) → service_activities column.
const LIONS_COLS: Record<string, string> = {
  sponsormd: 'sponsor_md',
  sponsordistrict: 'sponsor_district',
  sponsoraccountname: 'sponsor_account_name',
  startdate: 'start_date',
  enddate: 'end_date',
  reportcomplete: 'report_complete',
  status: 'status',
  title: 'title',
  description: 'description',
  activitylevel: 'activity_level',
  cause: 'cause',
  projecttype: 'project_type',
  signatureactivity: 'signature_activity',
  fundedbyanlcifgrant: 'funded_by_lcif_grant',
  peopleserved: 'people_served',
  peopleservedcapped: 'people_served_capped',
  totalvolunteers: 'total_volunteers',
  totalvolunteerhours: 'total_volunteer_hours',
  totalvolunteerhourscapped: 'total_volunteer_hours_capped',
  totalfundsdonated: 'total_funds_donated',
  totalfundsdonatedusdcapped: 'total_funds_donated_usd_capped',
  donationtolcif: 'donation_to_lcif',
  organizationbenefited: 'organization_benefited',
  totalfundsraised: 'total_funds_raised',
  totalfundsraisedusdcapped: 'total_funds_raised_usd_capped',
  treesplantedcaredfor: 'trees_planted',
  createdbyfullname: 'created_by_full_name',
  serviceactivityid: 'service_activity_id',
  sponsorzone: 'sponsor_zone',
  sponsorregion: 'sponsor_region',
  sponsoraccountid: 'sponsor_account_id',
  sponsorparentid: 'sponsor_parent_id',
  sponsorparentparentid: 'sponsor_parent_parent_id',
};

// Plain-template aliases (normalized header → activities field).
const SIMPLE_ALIASES: Record<string, string[]> = {
  title: ['title', 'projecttitle', 'activity', 'activityname', 'name'],
  description: ['description', 'details', 'report', 'summary'],
  category: ['category', 'servicecategory', 'cause'],
  beneficiaries: ['beneficiaries', 'peopleserved', 'livesimpacted'],
  service_hours: ['servicehours', 'hours', 'totalvolunteerhours', 'volunteerhours'],
  amount_raised: ['amountraised', 'fundsraised', 'totalfundsraised', 'raised'],
  date: ['date', 'enddate', 'activitydate'],
  location: ['location', 'venue', 'place'],
  club_id: ['clubid', 'club'],
};

type Supa = ReturnType<typeof createAdminClient>;
type Fail = { row: number; reason: string };

/** Locate the Lion-Portal header row (Title alongside Cause/People Served/ID). */
function findLionsHeader(matrix: string[][]): number {
  const scan = Math.min(matrix.length, 40);
  for (let i = 0; i < scan; i++) {
    const cells = (matrix[i] ?? []).map(norm);
    if (
      cells.includes('title') &&
      (cells.includes('cause') || cells.includes('peopleserved') || cells.includes('serviceactivityid'))
    ) {
      return i;
    }
  }
  return -1;
}

/** Upsert one `activities` row (keyed on title + date); returns its id. */
async function upsertActivity(
  supa: Supa,
  payload: Record<string, unknown>,
  result: SyncResult,
  rowNo: number,
): Promise<string | null> {
  const { data: existing } = await supa
    .from('activities')
    .select('id')
    .eq('title', payload.title as string)
    .eq('date', payload.date as string)
    .maybeSingle();

  if (existing) {
    const { error } = await supa.from('activities').update(payload).eq('id', existing.id);
    if (error) {
      result.failed++;
      result.failures.push({ row: rowNo, reason: error.message });
      return null;
    }
    result.updated++;
    return existing.id as string;
  }

  const { data: inserted, error } = await supa
    .from('activities')
    .insert(payload)
    .select('id')
    .single();
  if (error || !inserted) {
    result.failed++;
    result.failures.push({ row: rowNo, reason: error?.message ?? 'insert failed' });
    return null;
  }
  result.inserted++;
  return inserted.id as string;
}

/** Import the Lion-Portal "Service Activities Information" export. */
async function runLions(
  supa: Supa,
  matrix: string[][],
  headerIdx: number,
  sourceFile: string | null,
  result: SyncResult,
): Promise<void> {
  const headers = (matrix[headerIdx] ?? []).map(norm);
  const col: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const field = LIONS_COLS[h];
    if (field && col[field] === undefined) col[field] = idx;
  });

  const get = (r: string[], field: string): string =>
    col[field] === undefined ? '' : txt(r[col[field]]);

  // Resolve club_id from sponsor account name once per distinct name.
  const clubCache = new Map<string, string | null>();
  async function resolveClub(accountName: string): Promise<string | null> {
    const keyName = accountName.trim();
    if (!keyName) return null;
    if (clubCache.has(keyName)) return clubCache.get(keyName)!;
    const { data } = await supa
      .from('clubs')
      .select('id')
      .ilike('name', `%${keyName}%`)
      .limit(1)
      .maybeSingle();
    const id = (data?.id as string | undefined) ?? null;
    clubCache.set(keyName, id);
    return id;
  }

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i] ?? [];
    result.total++;
    const rowNo = i + 1;

    const account = get(r, 'sponsor_account_name');
    const title = get(r, 'title');
    // Skip banner/footer/subtotal/spacer rows.
    if (/^(subtotal|total|grand total|confidential|copyright)/i.test(account)) { result.total--; continue; }
    if (/^(subtotal|total|grand total)$/i.test(title)) { result.total--; continue; }
    if (!title) { result.total--; continue; }

    const endDate = toDate(get(r, 'end_date'));
    const startDate = toDate(get(r, 'start_date'));
    const date = endDate ?? startDate;
    if (title.length < 3 || !date) {
      result.failed++;
      result.failures.push({ row: rowNo, reason: !date ? 'missing/unreadable date' : 'title too short' });
      continue;
    }

    const cause = get(r, 'cause');
    const projectType = get(r, 'project_type');
    const category = mapCategory(cause, title, projectType);
    const accountName = account || get(r, 'sponsor_account_name');
    const clubId = accountName ? await resolveClub(accountName) : null;

    // 1) Map down to the app activities model.
    const activityId = await upsertActivity(
      supa,
      {
        title,
        description: get(r, 'description') || null,
        category,
        beneficiaries: Math.round(num(get(r, 'people_served'))),
        service_hours: num(get(r, 'total_volunteer_hours')),
        amount_raised: num(get(r, 'total_funds_raised')),
        date,
        club_id: clubId,
        reported_to_district: true,
        ...(col.total_volunteers !== undefined
          ? { lion_members_count: Math.round(num(get(r, 'total_volunteers'))) }
          : {}),
      },
      result,
      rowNo,
    );

    // 2) Preserve the full-fidelity portal row.
    const serviceActivityId = get(r, 'service_activity_id');
    const sa: Record<string, unknown> = {
      sponsor_md: get(r, 'sponsor_md') || null,
      sponsor_district: get(r, 'sponsor_district') || null,
      sponsor_account_name: accountName || null,
      sponsor_zone: get(r, 'sponsor_zone') || null,
      sponsor_region: get(r, 'sponsor_region') || null,
      sponsor_account_id: get(r, 'sponsor_account_id') || null,
      sponsor_parent_id: get(r, 'sponsor_parent_id') || null,
      sponsor_parent_parent_id: get(r, 'sponsor_parent_parent_id') || null,
      start_date: startDate,
      end_date: endDate,
      report_complete: bool(get(r, 'report_complete')),
      status: get(r, 'status') || null,
      title,
      description: get(r, 'description') || null,
      activity_level: get(r, 'activity_level') || null,
      cause: cause || null,
      project_type: projectType || null,
      signature_activity: bool(get(r, 'signature_activity')),
      funded_by_lcif_grant: bool(get(r, 'funded_by_lcif_grant')),
      people_served: Math.round(num(get(r, 'people_served'))),
      people_served_capped: Math.round(num(get(r, 'people_served_capped'))),
      total_volunteers: Math.round(num(get(r, 'total_volunteers'))),
      total_volunteer_hours: num(get(r, 'total_volunteer_hours')),
      total_volunteer_hours_capped: num(get(r, 'total_volunteer_hours_capped')),
      total_funds_donated: num(get(r, 'total_funds_donated')),
      total_funds_donated_usd_capped: num(get(r, 'total_funds_donated_usd_capped')),
      donation_to_lcif: bool(get(r, 'donation_to_lcif')),
      organization_benefited: get(r, 'organization_benefited') || null,
      total_funds_raised: num(get(r, 'total_funds_raised')),
      total_funds_raised_usd_capped: num(get(r, 'total_funds_raised_usd_capped')),
      trees_planted: num(get(r, 'trees_planted')),
      created_by_full_name: get(r, 'created_by_full_name') || null,
      service_activity_id: serviceActivityId || null,
      club_id: clubId,
      activity_id: activityId,
      category,
      source_file: sourceFile,
    };
    await upsertServiceActivity(supa, sa, serviceActivityId, clubId, title, endDate, result.failures, rowNo);
  }
}

/** Upsert one `service_activities` row (keyed on portal ID, else club+title+end_date). */
async function upsertServiceActivity(
  supa: Supa,
  sa: Record<string, unknown>,
  serviceActivityId: string,
  clubId: string | null,
  title: string,
  endDate: string | null,
  failures: Fail[],
  rowNo: number,
): Promise<void> {
  let query = supa.from('service_activities').select('id');
  if (serviceActivityId) {
    query = query.eq('service_activity_id', serviceActivityId);
  } else {
    query = query.eq('title', title);
    query = clubId ? query.eq('club_id', clubId) : query.is('club_id', null);
    query = endDate ? query.eq('end_date', endDate) : query.is('end_date', null);
  }
  const { data: existing } = await query.limit(1).maybeSingle();

  const { error } = existing
    ? await supa.from('service_activities').update(sa).eq('id', existing.id as string)
    : await supa.from('service_activities').insert(sa);
  // A failure here is non-fatal: the activities row already imported. Record it.
  if (error) failures.push({ row: rowNo, reason: `service_activities: ${error.message}` });
}

/** Import a plain template (headers on the first row) into activities only. */
async function runSimple(supa: Supa, matrix: string[][], result: SyncResult): Promise<void> {
  const headers = (matrix[0] ?? []).map(norm);
  const cm: Record<string, number> = {};
  headers.forEach((h, idx) => {
    for (const [field, aliases] of Object.entries(SIMPLE_ALIASES)) {
      if (cm[field] === undefined && aliases.includes(h)) cm[field] = idx;
    }
  });
  if (cm.title === undefined || cm.date === undefined) {
    throw new Error('CSV is missing required "title" and "date" columns');
  }

  const get = (r: string[], f: string) => (cm[f] === undefined ? '' : txt(r[cm[f]]));

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i] ?? [];
    const title = get(r, 'title');
    if (!title) continue;
    result.total++;
    const rowNo = i + 1;

    const date = toDate(get(r, 'date'));
    if (title.length < 3 || !date) {
      result.failed++;
      result.failures.push({ row: rowNo, reason: !date ? 'missing/unreadable date' : 'title too short' });
      continue;
    }
    const rawCat = get(r, 'category');
    const category = rawCat ? mapCategory(rawCat, title, '') : null;
    const clubId = get(r, 'club_id') || null;

    await upsertActivity(
      supa,
      {
        title,
        description: get(r, 'description') || null,
        category,
        beneficiaries: Math.round(num(get(r, 'beneficiaries'))),
        service_hours: num(get(r, 'service_hours')),
        amount_raised: num(get(r, 'amount_raised')),
        date,
        location: get(r, 'location') || null,
        club_id: clubId,
      },
      result,
      rowNo,
    );
  }
}

export const csvActivitiesAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'activities',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const csv = (job.payload?.csv as string | undefined) ?? '';
    const sourceFile = (job.payload?.filename as string | undefined) ?? null;
    const result: SyncResult = {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    };
    if (!csv.trim()) return result;

    const matrix = parseCsv(csv);
    if (!matrix.length) return result;

    const supa = createAdminClient();
    const lionsHeaderIdx = findLionsHeader(matrix);
    if (lionsHeaderIdx >= 0) {
      await runLions(supa, matrix, lionsHeaderIdx, sourceFile, result);
    } else {
      await runSimple(supa, matrix, result);
    }
    return result;
  },
};
