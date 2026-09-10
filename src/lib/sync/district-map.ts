/**
 * Shared, dependency-free mapping for Lions Portal *district* exports.
 *
 * Used by both the client uploader (parsing an .xlsx/.csv the DG downloads
 * from the portal) and the server CSV adapter, so header detection and
 * field normalization stay identical. Pure module — no imports, safe to
 * bundle into client components.
 */

/** Canonical district shape. Only `code` is required; absent fields stay
 *  undefined so upserts can skip them instead of nulling existing data. */
export interface CanonicalDistrict {
  code: string;
  name?: string;
  multiple_district_code?: string;
  constitutional_area?: string;
  status?: string;
  governor_name?: string;
  governor_email?: string;
  governor_phone?: string;
  first_vice_governor_name?: string;
  second_vice_governor_name?: string;
  cabinet_secretary_name?: string;
  cabinet_treasurer_name?: string;
  club_count?: number;
  member_count?: number;
  region_count?: number;
  zone_count?: number;
  effective_date?: string;
  website?: string;
  lions_year?: string;
}

/** Strip everything but a-z0-9 so header matching is punctuation/space-insensitive. */
export function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Normalized header aliases → canonical field. First match wins. */
export const DISTRICT_ALIASES: Record<keyof CanonicalDistrict, string[]> = {
  code: ['districtnumber', 'districtcode', 'districtno', 'district', 'dist'],
  name: ['districtname', 'name'],
  multiple_district_code: ['multipledistrict', 'multipledistrictnumber', 'multipledistrictcode', 'mdnumber', 'md'],
  constitutional_area: ['constitutionalarea', 'ca', 'area'],
  status: ['districtstatus', 'status'],
  governor_name: ['districtgovernor', 'governorname', 'dgname', 'governor', 'dg'],
  governor_email: ['districtgovernoremail', 'governoremail', 'dgemail'],
  governor_phone: ['districtgovernorphone', 'governorphone', 'governormobile', 'dgphone', 'dgmobile'],
  first_vice_governor_name: ['firstvicedistrictgovernor', '1stvicedistrictgovernor', 'firstvdg', '1stvdg', 'fvdg'],
  second_vice_governor_name: ['secondvicedistrictgovernor', '2ndvicedistrictgovernor', 'secondvdg', '2ndvdg', 'svdg'],
  cabinet_secretary_name: ['cabinetsecretary', 'cabinetsecretaryname', 'cs'],
  cabinet_treasurer_name: ['cabinettreasurer', 'cabinettreasurername', 'ct'],
  club_count: ['clubcount', 'totalclubs', 'numberofclubs', 'noofclubs', 'clubs'],
  member_count: ['membercount', 'totalmembers', 'numberofmembers', 'noofmembers', 'membership', 'members'],
  region_count: ['regioncount', 'numberofregions', 'noofregions', 'regions'],
  zone_count: ['zonecount', 'numberofzones', 'noofzones', 'zones'],
  effective_date: ['effectivedate', 'charterdate', 'asofdate', 'reportdate'],
  website: ['website', 'websiteurl', 'url', 'web'],
  lions_year: ['lionsyear', 'fiscalyear', 'lionaticyear', 'year'],
};

const NUMERIC_FIELDS = new Set<keyof CanonicalDistrict>([
  'club_count', 'member_count', 'region_count', 'zone_count',
]);

/** Map a header row to canonical field → column index. */
export function mapDistrictHeaders(headers: unknown[]): Partial<Record<keyof CanonicalDistrict, number>> {
  const normalized = headers.map(norm);
  const col: Partial<Record<keyof CanonicalDistrict, number>> = {};
  normalized.forEach((h, idx) => {
    for (const [field, aliases] of Object.entries(DISTRICT_ALIASES) as [keyof CanonicalDistrict, string[]][]) {
      if (col[field] === undefined && h && aliases.includes(h)) col[field] = idx;
    }
  });
  return col;
}

function toNumber(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build a CanonicalDistrict from a `get(field)` accessor (returns the raw
 * cell string for a canonical field, or '' when the column is absent).
 * Returns { record: null, error } when the row has no district code.
 */
export function normalizeDistrictRecord(
  get: (field: keyof CanonicalDistrict) => string,
): { record: CanonicalDistrict | null; error?: string } {
  const code = get('code').trim();
  if (!code) return { record: null, error: 'District number/code is required' };

  const record: CanonicalDistrict = { code };
  for (const field of Object.keys(DISTRICT_ALIASES) as (keyof CanonicalDistrict)[]) {
    if (field === 'code') continue;
    const raw = get(field).trim();
    if (!raw) continue;
    if (NUMERIC_FIELDS.has(field)) {
      const n = toNumber(raw);
      if (n !== undefined) (record[field] as number) = n;
    } else {
      (record[field] as string) = raw;
    }
  }
  if (!record.name) record.name = `District ${code}`;
  return { record };
}
