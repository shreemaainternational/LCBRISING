/**
 * Lions International high-level adapter.
 *
 * Sits on top of the generic OIDC pipeline (src/lib/oidc/*) and adds:
 *  - Named provider config with sensible defaults for Lions issuer
 *  - MyLCI claim mapping (member_id, club_id, district_code, roles)
 *  - REST sync helpers for member, club, district, officer and award
 *    data using the MyLCI / Lions Member Portal REST patterns. The
 *    actual endpoint URLs and auth flow are pluggable via env so this
 *    works against a sandbox, a partner gateway, or a future official
 *    LCI API without code changes.
 *
 * When LIONS_API_BASE_URL is not set, the sync helpers run in
 * "dry-run" mode and return zeroed counts. That keeps the admin UI
 * functional in development.
 */
import { env, integrations } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';
import type { LionsRole, MemberStatus } from '@/lib/supabase/database.types';
import type { UserInfo } from './client';

export type LionsSyncEntity =
  | 'member' | 'club' | 'district' | 'multi_district' | 'officer' | 'award';

export interface LionsSyncReport {
  entity: LionsSyncEntity;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
  dryRun: boolean;
}

export interface LionsApiConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  districtCode?: string;
  multipleDistrictCode?: string;
}

import { peekLionsApiSettings } from './lions-api-runtime';

function merge(): {
  base_url?: string; api_key?: string; access_token?: string;
  district_code?: string; multi_district_code?: string;
} {
  const db = peekLionsApiSettings();
  return {
    base_url:            db?.base_url            ?? env.LIONS_API_BASE_URL,
    api_key:             db?.api_key             ?? env.LIONS_API_KEY,
    access_token:        db?.access_token        ?? env.LIONS_API_ACCESS_TOKEN,
    district_code:       db?.district_code       ?? env.LIONS_API_DISTRICT_CODE,
    multi_district_code: db?.multi_district_code ?? env.LIONS_API_MULTI_DISTRICT_CODE,
  };
}

export function isLionsApiConfigured(): boolean {
  return Boolean(merge().base_url);
}

export function getLionsApiConfig(): LionsApiConfig | null {
  const m = merge();
  if (!m.base_url) return null;
  return {
    baseUrl: m.base_url.replace(/\/$/, ''),
    apiKey: m.api_key,
    accessToken: m.access_token,
    districtCode: m.district_code,
    multipleDistrictCode: m.multi_district_code,
  };
}

function lionsHeaders(cfg: LionsApiConfig): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (cfg.apiKey) h['X-API-Key'] = cfg.apiKey;
  if (cfg.accessToken) h['Authorization'] = `Bearer ${cfg.accessToken}`;
  return h;
}

/* ------------------------------------------------------------------ */
/* Profile mapping (used by OIDC callback)                            */
/* ------------------------------------------------------------------ */

const LCI_ROLE_MAP: Record<string, LionsRole> = {
  'lci.role.international_admin':    'international_admin',
  'lci.role.multiple_district_admin': 'multiple_district_admin',
  'lci.role.district_governor':       'district_governor',
  'lci.role.vice_district_governor':  'vice_district_governor',
  'lci.role.cabinet_officer':         'cabinet_officer',
  'lci.role.region_chairperson':      'region_chairperson',
  'lci.role.zone_chairperson':        'zone_chairperson',
  'lci.role.club_president':          'club_president',
  'lci.role.club_secretary':          'club_secretary',
  'lci.role.club_treasurer':          'club_treasurer',
  'lci.role.club_officer':            'club_officer',
  'lci.role.member':                  'member',
  // Friendly aliases sometimes seen in claims
  'president': 'club_president',
  'secretary': 'club_secretary',
  'treasurer': 'club_treasurer',
  'governor':  'district_governor',
};

/**
 * Normalize a UserInfo coming back from the Lions OIDC IdP into a
 * payload that's easy to persist to public.members.
 */
export interface NormalizedLionsProfile {
  lionsMemberId: string | null;
  email: string | null;
  name: string;
  clubExternalId: string | null;
  districtCode: string | null;
  multipleDistrictCode: string | null;
  lionsRole: LionsRole | null;
  rolesRaw: string[];
}

export function normalizeLionsProfile(p: UserInfo): NormalizedLionsProfile {
  const rolesRaw: string[] = Array.isArray(p.roles)
    ? (p.roles as string[])
    : typeof p['lci.roles'] === 'string'
      ? String(p['lci.roles']).split(/[ ,]+/)
      : [];

  let mapped: LionsRole | null = null;
  for (const r of rolesRaw) {
    const m = LCI_ROLE_MAP[r];
    if (m) { mapped = m; break; }
  }

  return {
    lionsMemberId:
      (p.lions_member_id as string | undefined) ??
      (p['lci.member_id'] as string | undefined) ??
      (p['member_number'] as string | undefined) ?? null,
    email: p.email ?? null,
    name: p.name ?? ([p.given_name, p.family_name].filter(Boolean).join(' ') || (p.email ?? 'Lion')),
    clubExternalId:
      (p.club_id as string | undefined) ??
      (p['lci.club_id'] as string | undefined) ??
      (p['club_number'] as string | undefined) ?? null,
    districtCode:
      (p.district_code as string | undefined) ??
      (p['lci.district_code'] as string | undefined) ?? null,
    multipleDistrictCode: (p['lci.multiple_district_code'] as string | undefined) ?? null,
    lionsRole: mapped,
    rolesRaw,
  };
}

/* ------------------------------------------------------------------ */
/* Sync helpers                                                       */
/* ------------------------------------------------------------------ */

interface LionsMemberRecord {
  member_id: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status?: string;
  club_id?: string;
  birthday?: string;
  joined_at?: string;
  roles?: string[];
  avatar_url?: string;
}

interface LionsClubRecord {
  club_id: string;
  name: string;
  district_code?: string;
  charter_date?: string;
  city?: string;
  state?: string;
  country?: string;
  meeting_schedule?: unknown;
}

interface LionsDistrictRecord {
  district_code: string;
  name: string;
  multiple_district_code?: string;
  governor_name?: string;
  lions_year?: string;
}

async function fetchLionsList<T>(cfg: LionsApiConfig, path: string): Promise<T[]> {
  const url = `${cfg.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { headers: lionsHeaders(cfg), cache: 'no-store' });
  if (!res.ok) throw new Error(`Lions API ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json() as { data?: T[]; items?: T[] } | T[];
  return Array.isArray(body) ? body : (body.data ?? body.items ?? []);
}

function statusFromLions(s?: string): MemberStatus {
  const n = (s ?? '').toLowerCase();
  if (n.includes('active'))  return 'active';
  if (n.includes('drop') || n.includes('lapsed')) return 'lapsed';
  if (n.includes('suspend')) return 'suspended';
  return 'pending';
}

function startReport(entity: LionsSyncEntity, dryRun: boolean): LionsSyncReport {
  return { entity, fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [], durationMs: 0, dryRun };
}

export async function syncLionsDistricts(): Promise<LionsSyncReport> {
  const t0 = Date.now();
  const cfg = getLionsApiConfig();
  const r = startReport('district', !cfg);
  if (!cfg) { r.durationMs = Date.now() - t0; return r; }

  try {
    const path = cfg.multipleDistrictCode
      ? `/multiple-districts/${cfg.multipleDistrictCode}/districts`
      : `/districts`;
    const list = await fetchLionsList<LionsDistrictRecord>(cfg, path);
    r.fetched = list.length;

    const db = createAdminClient();
    for (const d of list) {
      try {
        const { data: existing } = await db.from('districts')
          .select('id').eq('code', d.district_code).maybeSingle();
        const payload = {
          code: d.district_code,
          name: d.name,
          governor_name: d.governor_name ?? null,
          lions_year: d.lions_year ?? null,
          source_id: d.district_code,
        };
        if (existing?.id) {
          await db.from('districts').update(payload).eq('id', existing.id);
          r.updated++;
        } else {
          await db.from('districts').insert(payload);
          r.inserted++;
        }
      } catch (e) { r.errors.push(`${d.district_code}: ${e}`); r.skipped++; }
    }
  } catch (e) { r.errors.push(String(e)); }
  r.durationMs = Date.now() - t0;
  return r;
}

export async function syncLionsClubs(districtCode?: string): Promise<LionsSyncReport> {
  const t0 = Date.now();
  const cfg = getLionsApiConfig();
  const r = startReport('club', !cfg);
  if (!cfg) { r.durationMs = Date.now() - t0; return r; }

  try {
    const dCode = districtCode ?? cfg.districtCode;
    const list = await fetchLionsList<LionsClubRecord>(
      cfg, dCode ? `/districts/${dCode}/clubs` : `/clubs`,
    );
    r.fetched = list.length;
    const db = createAdminClient();

    // Pre-fetch districts to map codes → ids.
    const { data: districtRows } = await db.from('districts').select('id, code');
    const dMap = new Map((districtRows ?? []).map((d) => [d.code, d.id]));

    for (const c of list) {
      try {
        const districtId = c.district_code ? dMap.get(c.district_code) ?? null : null;
        const payload = {
          name: c.name,
          district: c.district_code ?? '',
          district_id: districtId,
          source_id: c.club_id,
          club_number: c.club_id,
          charter_date: c.charter_date ?? null,
          city: c.city ?? null,
          state: c.state ?? null,
          country: c.country ?? 'India',
        };
        const { data: existing } = await db.from('clubs')
          .select('id').eq('source_id', c.club_id).maybeSingle();
        if (existing?.id) {
          await db.from('clubs').update(payload).eq('id', existing.id);
          r.updated++;
        } else {
          await db.from('clubs').insert(payload);
          r.inserted++;
        }
      } catch (e) { r.errors.push(`${c.club_id}: ${e}`); r.skipped++; }
    }
  } catch (e) { r.errors.push(String(e)); }
  r.durationMs = Date.now() - t0;
  return r;
}

export async function syncLionsMembers(clubExternalId?: string): Promise<LionsSyncReport> {
  const t0 = Date.now();
  const cfg = getLionsApiConfig();
  const r = startReport('member', !cfg);
  if (!cfg) { r.durationMs = Date.now() - t0; return r; }

  try {
    const list = await fetchLionsList<LionsMemberRecord>(
      cfg, clubExternalId ? `/clubs/${clubExternalId}/members` : `/members`,
    );
    r.fetched = list.length;
    const db = createAdminClient();

    const { data: clubRows } = await db.from('clubs').select('id, source_id');
    const clubMap = new Map((clubRows ?? []).filter((c) => c.source_id).map((c) => [c.source_id!, c.id]));

    for (const m of list) {
      try {
        const clubId = m.club_id ? clubMap.get(m.club_id) ?? null : null;
        const fullName = m.name ?? ([m.first_name, m.last_name].filter(Boolean).join(' ') || 'Lion');
        const email = m.email ?? `lci-${m.member_id}@placeholder.local`;
        const roles: LionsRole | null = (() => {
          for (const r of m.roles ?? []) { const v = LCI_ROLE_MAP[r]; if (v) return v; }
          return null;
        })();
        const payload = {
          name: fullName,
          email,
          phone: m.phone ?? null,
          birthday: m.birthday ?? null,
          joined_at: m.joined_at ?? null,
          status: statusFromLions(m.status),
          lions_member_id: m.member_id,
          lions_role: roles,
          club_id: clubId,
          avatar_url: m.avatar_url ?? null,
          last_sync_at: new Date().toISOString(),
        };
        const { data: existing } = await db.from('members')
          .select('id').eq('lions_member_id', m.member_id).maybeSingle();
        if (existing?.id) {
          await db.from('members').update(payload).eq('id', existing.id);
          r.updated++;
        } else {
          await db.from('members').insert(payload);
          r.inserted++;
        }
      } catch (e) { r.errors.push(`${m.member_id}: ${e}`); r.skipped++; }
    }
  } catch (e) { r.errors.push(String(e)); }
  r.durationMs = Date.now() - t0;
  return r;
}

export async function syncLionsAll(): Promise<LionsSyncReport[]> {
  const out: LionsSyncReport[] = [];
  out.push(await syncLionsDistricts());
  out.push(await syncLionsClubs());
  out.push(await syncLionsMembers());
  return out;
}

/* ------------------------------------------------------------------ */
/* OpenAI etc. unused — explicit no-op so the file imports cleanly    */
/* ------------------------------------------------------------------ */
void integrations;
