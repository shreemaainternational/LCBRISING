/**
 * Lions International Portal — District data sync via District Governor login.
 *
 * The Lions Member Portal (lionsinternational.my.site.com) has no public
 * REST API, so this adapter authenticates the way a DG does: it exchanges
 * the stored username/password for a session at a configurable login/token
 * endpoint, then reads district data from a configurable data endpoint. The
 * endpoints are pluggable so this works against MyLCI, a partner gateway, or
 * a future official LCI district API without code changes.
 *
 * Behaviour, matching the REST adapter (lions.ts):
 *   - sandbox_mode          → returns a canned district record
 *   - active + endpoints set → live login + fetch
 *   - not configured         → dry-run (zeroed report)
 *
 * Credentials are stored ENCRYPTED (secret-box) and only ever decrypted
 * server-side here.
 */
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto/secret-box';
import { peekLionsPortalSettings } from './lions-portal-runtime';
import type { LionsSyncReport } from './lions';

export interface LionsPortalConfig {
  username: string;
  password: string;
  loginUrl: string;
  dataUrl: string;
  districtCode?: string;
  sessionToken?: string | null;
  sessionExpiresAt?: string | null;
}

/** A district record in the shape the Lions Portal exposes to a DG. */
export interface PortalDistrictRecord {
  district_code: string;
  name: string;
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
  raw?: Record<string, unknown>;
}

function merge(): {
  username?: string; password?: string; login_url?: string;
  data_url?: string; district_code?: string;
  session_token?: string | null; session_expires_at?: string | null;
} {
  const db = peekLionsPortalSettings();
  return {
    username:           db?.username           ?? env.LIONS_PORTAL_USERNAME,
    password:           db?.password           ?? env.LIONS_PORTAL_PASSWORD,
    login_url:          db?.login_url          ?? env.LIONS_PORTAL_LOGIN_URL,
    data_url:           db?.data_url           ?? env.LIONS_PORTAL_DATA_URL,
    district_code:      db?.district_code      ?? env.LIONS_PORTAL_DISTRICT_CODE,
    session_token:      db?.session_token      ?? null,
    session_expires_at: db?.session_expires_at ?? null,
  };
}

export function isLionsPortalSandbox(): boolean {
  return Boolean(peekLionsPortalSettings()?.sandbox_mode);
}

export function isLionsPortalConfigured(): boolean {
  if (isLionsPortalSandbox()) return true;
  const m = merge();
  return Boolean(m.username && m.password && m.login_url && m.data_url);
}

export function getLionsPortalConfig(): LionsPortalConfig | null {
  const m = merge();
  if (!m.username || !m.password || !m.login_url || !m.data_url) return null;
  return {
    username: m.username,
    password: m.password,
    loginUrl: m.login_url.replace(/\/$/, ''),
    dataUrl: m.data_url,
    districtCode: m.district_code || undefined,
    sessionToken: m.session_token ?? null,
    sessionExpiresAt: m.session_expires_at ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

function pickToken(body: unknown): { token: string; expiresAt: string | null } | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const token =
    (o.access_token as string | undefined) ??
    (o.token as string | undefined) ??
    (o.session_token as string | undefined) ??
    (o.sessionToken as string | undefined) ??
    (o.session_id as string | undefined) ??
    (o.id_token as string | undefined);
  if (!token || typeof token !== 'string') return null;
  let expiresAt: string | null = null;
  const expiresIn = o.expires_in ?? o.expiresIn;
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  } else if (typeof o.expires_at === 'string') {
    expiresAt = o.expires_at;
  }
  return { token, expiresAt };
}

/**
 * Log in with the DG credentials and return a session token. Reuses a
 * cached, unexpired token from the config when available; otherwise POSTs
 * to the login endpoint and persists the fresh token (encrypted).
 */
export async function loginLionsPortal(cfg: LionsPortalConfig): Promise<string> {
  const stillValid =
    cfg.sessionToken &&
    (!cfg.sessionExpiresAt || new Date(cfg.sessionExpiresAt).getTime() > Date.now() + 30_000);
  if (stillValid) return cfg.sessionToken as string;

  const res = await fetch(cfg.loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Lions Portal login → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const picked = pickToken(await res.json().catch(() => null));
  if (!picked) throw new Error('Lions Portal login returned no recognizable session token.');

  // Persist the token (encrypted) so subsequent syncs skip the login.
  try {
    await createAdminClient()
      .from('lions_portal_credentials')
      .update({
        session_token: encrypt(picked.token),
        session_expires_at: picked.expiresAt,
        last_login_ok: true,
        last_login_at: new Date().toISOString(),
        last_login_error: null,
      })
      .eq('id', 'singleton');
  } catch {
    /* non-fatal: token still usable for this run */
  }
  return picked.token;
}

/* ------------------------------------------------------------------ */
/* Fetch + normalize                                                  */
/* ------------------------------------------------------------------ */

function str(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}

function num(o: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

/**
 * Map a raw upstream district record (MyLCI / Salesforce field names vary)
 * onto our normalized PortalDistrictRecord. Filters to the fields Lions
 * International exposes; unknown keys are preserved in `raw`.
 */
export function normalizePortalDistrict(raw: Record<string, unknown>): PortalDistrictRecord | null {
  const district_code = str(raw, 'district_code', 'districtNumber', 'district_number', 'DistrictNumber', 'code', 'district');
  const name = str(raw, 'name', 'district_name', 'districtName', 'Name') ?? (district_code ? `District ${district_code}` : undefined);
  if (!district_code || !name) return null;
  return {
    district_code,
    name,
    multiple_district_code: str(raw, 'multiple_district_code', 'multipleDistrict', 'multiple_district', 'md_code'),
    constitutional_area: str(raw, 'constitutional_area', 'constitutionalArea', 'area'),
    status: str(raw, 'status', 'district_status', 'Status'),
    governor_name: str(raw, 'governor_name', 'districtGovernor', 'district_governor', 'dg_name'),
    governor_email: str(raw, 'governor_email', 'dg_email', 'email'),
    governor_phone: str(raw, 'governor_phone', 'dg_phone', 'phone'),
    first_vice_governor_name: str(raw, 'first_vice_governor_name', 'firstViceDistrictGovernor', 'fvdg_name'),
    second_vice_governor_name: str(raw, 'second_vice_governor_name', 'secondViceDistrictGovernor', 'svdg_name'),
    cabinet_secretary_name: str(raw, 'cabinet_secretary_name', 'cabinetSecretary', 'cs_name'),
    cabinet_treasurer_name: str(raw, 'cabinet_treasurer_name', 'cabinetTreasurer', 'ct_name'),
    club_count: num(raw, 'club_count', 'clubCount', 'clubs', 'total_clubs'),
    member_count: num(raw, 'member_count', 'memberCount', 'members', 'total_members'),
    region_count: num(raw, 'region_count', 'regionCount', 'regions'),
    zone_count: num(raw, 'zone_count', 'zoneCount', 'zones'),
    effective_date: str(raw, 'effective_date', 'effectiveDate', 'charter_date'),
    website: str(raw, 'website', 'url', 'websiteUrl'),
    lions_year: str(raw, 'lions_year', 'lionsYear', 'fiscal_year'),
    raw,
  };
}

async function fetchPortalDistricts(cfg: LionsPortalConfig, token: string): Promise<PortalDistrictRecord[]> {
  const url = new URL(cfg.dataUrl);
  if (cfg.districtCode) url.searchParams.set('district_code', cfg.districtCode);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Lions Portal district data → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = (await res.json()) as unknown;
  const rows: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown[] })?.data)
      ? (body as { data: unknown[] }).data
      : Array.isArray((body as { records?: unknown[] })?.records)
        ? (body as { records: unknown[] }).records
        : Array.isArray((body as { districts?: unknown[] })?.districts)
          ? (body as { districts: unknown[] }).districts
          : body && typeof body === 'object'
            ? [body]
            : [];
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map(normalizePortalDistrict)
    .filter((d): d is PortalDistrictRecord => d !== null);
}

const SANDBOX_PORTAL_DISTRICT: PortalDistrictRecord = {
  district_code: '3232 F1',
  name: 'District 3232 F1',
  multiple_district_code: '323',
  constitutional_area: 'ISAAME',
  status: 'Active',
  governor_name: 'Lion Sandbox DG',
  governor_email: 'dg.sandbox@lcbarodarisingstar.in',
  first_vice_governor_name: 'Lion Sandbox 1st VDG',
  second_vice_governor_name: 'Lion Sandbox 2nd VDG',
  cabinet_secretary_name: 'Lion Sandbox CS',
  cabinet_treasurer_name: 'Lion Sandbox CT',
  club_count: 62,
  member_count: 1840,
  region_count: 4,
  zone_count: 11,
  effective_date: '2025-07-01',
  website: 'https://www.lions3232f1.org',
  lions_year: '2025-26',
};

/* ------------------------------------------------------------------ */
/* Sync                                                               */
/* ------------------------------------------------------------------ */

function startReport(dryRun: boolean): LionsSyncReport {
  return { entity: 'district', fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [], durationMs: 0, dryRun };
}

/**
 * Sync district data from the Lions Portal using the stored DG login,
 * mapping it onto the (Portal-shaped) districts table. Falls back to
 * sandbox data or a dry-run when not fully configured.
 */
export async function syncLionsPortalDistricts(): Promise<LionsSyncReport> {
  const t0 = Date.now();
  const sandbox = isLionsPortalSandbox();
  const cfg = getLionsPortalConfig();
  const r = startReport(!sandbox && !cfg);
  if (!sandbox && !cfg) { r.durationMs = Date.now() - t0; return r; }

  try {
    let list: PortalDistrictRecord[];
    if (sandbox) {
      list = [SANDBOX_PORTAL_DISTRICT];
    } else {
      const token = await loginLionsPortal(cfg!);
      list = await fetchPortalDistricts(cfg!, token);
    }
    r.fetched = list.length;

    const db = createAdminClient();
    const { data: mdRows } = await db.from('multiple_districts').select('id, code');
    const mdMap = new Map((mdRows ?? []).map((m) => [m.code as string, m.id as string]));
    const syncedAt = new Date().toISOString();

    for (const d of list) {
      try {
        const mdId = d.multiple_district_code ? mdMap.get(d.multiple_district_code) ?? null : null;
        const payload: Record<string, unknown> = {
          code: d.district_code,
          name: d.name,
          multiple_district_id: mdId,
          multiple_district_code: d.multiple_district_code ?? null,
          constitutional_area: d.constitutional_area ?? null,
          status: d.status ?? null,
          governor_name: d.governor_name ?? null,
          governor_email: d.governor_email ?? null,
          governor_phone: d.governor_phone ?? null,
          first_vice_governor_name: d.first_vice_governor_name ?? null,
          second_vice_governor_name: d.second_vice_governor_name ?? null,
          cabinet_secretary_name: d.cabinet_secretary_name ?? null,
          cabinet_treasurer_name: d.cabinet_treasurer_name ?? null,
          club_count: d.club_count ?? null,
          member_count: d.member_count ?? null,
          region_count: d.region_count ?? null,
          zone_count: d.zone_count ?? null,
          effective_date: d.effective_date ?? null,
          website: d.website ?? null,
          lions_year: d.lions_year ?? null,
          source_id: d.district_code,
          portal_raw: d.raw ?? null,
          last_portal_sync_at: syncedAt,
        };
        const { data: existing } = await db.from('districts')
          .select('id').eq('code', d.district_code).maybeSingle();
        if (existing?.id) {
          const { error } = await db.from('districts').update(payload).eq('id', existing.id);
          if (error) throw new Error(error.message);
          r.updated++;
        } else {
          const { error } = await db.from('districts').insert(payload);
          if (error) throw new Error(error.message);
          r.inserted++;
        }
      } catch (e) { r.errors.push(`${d.district_code}: ${e}`); r.skipped++; }
    }

    // Stamp the sync timestamp for the admin UI.
    try {
      await db.from('lions_portal_credentials')
        .update({ last_sync_at: syncedAt })
        .eq('id', 'singleton');
    } catch { /* non-fatal */ }
  } catch (e) {
    r.errors.push(String(e));
    try {
      await createAdminClient().from('lions_portal_credentials')
        .update({ last_login_ok: false, last_login_error: String(e) })
        .eq('id', 'singleton');
    } catch { /* non-fatal */ }
  }
  r.durationMs = Date.now() - t0;
  return r;
}
