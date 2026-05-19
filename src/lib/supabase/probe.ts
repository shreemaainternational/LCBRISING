/**
 * Probe arbitrary Supabase URL + keys (not the ones currently in env)
 * by hitting PostgREST directly. Used by the setup wizard so an
 * operator can verify a key triple BEFORE writing it into Vercel.
 */
export type ClientProbe = {
  ok: boolean;
  status?: number;
  error?: string;
  code?: 'invalid_key' | 'invalid_schema' | 'network' | 'rls' | 'project_mismatch' | 'unknown';
};

export type TripleProbe = {
  url: { ok: boolean; error?: string };
  anon: ClientProbe;
  serviceRole: ClientProbe | null;
  /** Whether all three (or two if service role is absent) belong to the same project. */
  consistent: boolean;
  diagnosis: string | null;
};

function classify(status: number, body: string): NonNullable<ClientProbe['code']> {
  const m = body.toLowerCase();
  if (status === 401 || /invalid api key|invalid jwt|jwsverification|jwt expired/.test(m)) return 'invalid_key';
  if (/invalid schema|schema "public"/.test(m)) return 'invalid_schema';
  if (/row.level security|permission denied/.test(m)) return 'rls';
  if (status === 0) return 'network';
  return 'unknown';
}

async function probe(url: string, key: string): Promise<ClientProbe> {
  try {
    const u = new URL('/rest/v1/districts?select=id&limit=0', url);
    const res = await fetch(u.toString(), {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Accept-Profile': 'public',
      },
      cache: 'no-store',
      // 8s budget — we don't want the wizard to hang on a dead host.
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: body.slice(0, 240) || res.statusText, code: classify(res.status, body) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, error: msg, code: 'network' };
  }
}

function parseProjectRef(url: string): string | null {
  try {
    const h = new URL(url).hostname;
    const m = h.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function parseKeyRef(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

export async function probeSupabaseTriple(input: {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}): Promise<TripleProbe> {
  // URL sanity
  let urlOk = false;
  let urlErr: string | undefined;
  try {
    const u = new URL(input.url);
    urlOk = u.protocol === 'https:';
    if (!urlOk) urlErr = 'URL must use https://';
  } catch (e) {
    urlErr = e instanceof Error ? e.message : 'invalid URL';
  }

  // JWT-encoded project ref vs URL hostname — catches mismatches before
  // we even hit the network.
  const urlRef = parseProjectRef(input.url);
  const anonRef = parseKeyRef(input.anonKey);
  const srRef = input.serviceRoleKey ? parseKeyRef(input.serviceRoleKey) : null;
  const mismatched: ClientProbe['code'] = 'project_mismatch';

  let anon: ClientProbe;
  if (urlRef && anonRef && urlRef !== anonRef) {
    anon = { ok: false, error: `anon key project ref "${anonRef}" ≠ URL project ref "${urlRef}"`, code: mismatched };
  } else if (!urlOk) {
    anon = { ok: false, error: urlErr ?? 'invalid URL', code: 'network' };
  } else {
    anon = await probe(input.url, input.anonKey);
  }

  let serviceRole: ClientProbe | null = null;
  if (input.serviceRoleKey) {
    if (urlRef && srRef && urlRef !== srRef) {
      serviceRole = { ok: false, error: `service-role key project ref "${srRef}" ≠ URL project ref "${urlRef}"`, code: mismatched };
    } else if (!urlOk) {
      serviceRole = { ok: false, error: urlErr ?? 'invalid URL', code: 'network' };
    } else {
      serviceRole = await probe(input.url, input.serviceRoleKey);
    }
  }

  const consistent = urlOk && anon.ok && (serviceRole === null || serviceRole.ok);
  let diagnosis: string | null = null;
  if (!consistent) {
    if (!urlOk) diagnosis = urlErr ?? 'URL is invalid';
    else if (anon.code === 'project_mismatch' || serviceRole?.code === 'project_mismatch') {
      diagnosis = 'One or more keys belong to a different Supabase project than the URL. Copy URL, anon, and service-role from the same Project Settings → API page.';
    } else if (anon.code === 'invalid_key' || serviceRole?.code === 'invalid_key') {
      diagnosis = 'Supabase rejected a key as invalid. Re-copy from Project Settings → API (click "Reveal" before copying the service-role).';
    } else if (anon.code === 'network' || serviceRole?.code === 'network') {
      diagnosis = 'Cannot reach the project URL. The project is paused, deleted, or the URL is mistyped.';
    } else if (anon.code === 'invalid_schema' || serviceRole?.code === 'invalid_schema') {
      diagnosis = 'PostgREST rejected the public schema — usually a URL/project mismatch.';
    } else {
      diagnosis = 'One or more probes failed. See per-client details below.';
    }
  }

  return {
    url: { ok: urlOk, error: urlErr },
    anon,
    serviceRole,
    consistent,
    diagnosis,
  };
}
