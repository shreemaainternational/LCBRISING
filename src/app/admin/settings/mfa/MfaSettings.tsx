'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, KeyRound, Smartphone, Copy, Download, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };
type Enrollment = { factorId: string; qr: string; secret: string };

export function MfaSettings({
  email,
  required,
  forced,
  recovered,
  redirectTo,
  backupCodesAvailable,
}: {
  email: string;
  required: boolean;
  forced: boolean;
  recovered: boolean;
  redirectTo: string | null;
  backupCodesAvailable: boolean;
}) {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justEnabled, setJustEnabled] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().auth.mfa.listFactors();
    if (error) setError(error.message);
    setFactor((data?.totp?.find((f) => f.status === 'verified') as Factor | undefined) ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        setFactor((data?.totp?.find((f) => f.status === 'verified') as Factor | undefined) ?? null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      // Clear abandoned, never-verified attempts — Supabase rejects a new
      // enrolment while one with the same friendly name is pending.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
        issuer: 'Rising Star CRM',
      });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes('invalid')
          ? 'That code is wrong or expired. Make sure your phone clock is set automatically and try the next code.'
          : error.message,
      );
      setBusy(false);
      return;
    }
    // Session is now aal2 — persist the cookie for the server.
    await fetch('/api/auth/session/sync', { method: 'POST', credentials: 'include' }).catch(() => null);
    setEnrollment(null);
    setJustEnabled(true);
    setBusy(false);
    await load();
  }

  async function removeFactor() {
    if (!factor) return;
    const msg = required
      ? 'Replace your authenticator? You will scan a new QR code right away. Existing backup codes stop working.'
      : 'Turn off two-factor authentication? Sign-ins will need only your password.';
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    await supabase.auth.refreshSession();
    setFactor(null);
    setBusy(false);
    if (required) await startEnroll();
  }

  if (!loaded) {
    return (
      <div className="text-sm text-gray-500 inline-flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {recovered && !factor && (
        <Banner>
          Backup code accepted and your old authenticator was removed. Set up a new one below.
        </Banner>
      )}
      {forced && !factor && !recovered && (
        <Banner>
          Two-factor authentication is required for the CRM. Set up Google Authenticator to continue.
        </Banner>
      )}

      {factor ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} aria-hidden />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-emerald-900">MFA is on</h2>
              <p className="text-sm text-emerald-900/80 mt-1">
                Every sign-in for <code className="font-mono">{email}</code> now requires a fresh
                6-digit code from your authenticator.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {redirectTo && justEnabled && (
                  <a href={redirectTo} className="btn-navy rounded-lg px-4 py-2 text-sm">
                    Continue to CRM
                  </a>
                )}
                <button
                  type="button"
                  onClick={removeFactor}
                  disabled={busy}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {required ? 'Replace authenticator' : 'Turn off MFA'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <Smartphone className="text-navy-700 mt-0.5 shrink-0" size={20} aria-hidden />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-navy-800">MFA is off</h2>
              {!enrollment ? (
                <>
                  <p className="text-sm text-gray-600 mt-1">
                    Install Google Authenticator (or any TOTP app) on your phone, then scan a QR code
                    to link it to <code className="font-mono">{email}</code>.
                  </p>
                  <button
                    type="button"
                    onClick={startEnroll}
                    disabled={busy}
                    className="btn-navy rounded-lg px-4 py-2 text-sm mt-4 disabled:opacity-60"
                  >
                    {busy ? 'Preparing…' : 'Set up authenticator'}
                  </button>
                </>
              ) : (
                <form onSubmit={verifyEnroll} className="mt-3 grid gap-4">
                  <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-1">
                    <li>Open Google Authenticator and tap <b>+</b> → <b>Scan a QR code</b>.</li>
                    <li>Scan the code below (or enter the setup key manually).</li>
                    <li>Type the 6-digit code the app shows.</li>
                  </ol>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={enrollment.qr}
                      alt="QR code for your authenticator app"
                      className="h-44 w-44 rounded-lg border border-gray-200 bg-white p-2"
                    />
                    <div className="text-sm min-w-0">
                      <div className="text-gray-500">Setup key</div>
                      <code className="block font-mono break-all bg-gray-50 border border-gray-200 rounded px-2 py-1 mt-1 select-all">
                        {enrollment.secret}
                      </code>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      placeholder="123456"
                      aria-label="6-digit code"
                      className="h-11 w-full sm:w-44 rounded-lg border border-gray-300 px-3 text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    <button
                      type="submit"
                      disabled={busy || code.length !== 6}
                      className="btn-navy rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {busy ? 'Verifying…' : 'Verify & turn on'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <BackupCodes enabled={!!factor} available={backupCodesAvailable} highlight={justEnabled} />
    </div>
  );
}

function BackupCodes({
  enabled,
  available,
  highlight,
}: {
  enabled: boolean;
  available: boolean;
  highlight: boolean;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !available) return;
    fetch('/api/auth/mfa/backup-codes', { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((b) => setRemaining(typeof b.remaining === 'number' ? b.remaining : null))
      .catch(() => null);
  }, [enabled, available]);

  async function generate() {
    if (remaining && !confirm('Generate a new set? Your previous backup codes will stop working.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/mfa/backup-codes', { method: 'POST', credentials: 'include' });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? 'Could not generate backup codes.');
      return;
    }
    setCodes(body.codes);
    setRemaining(body.codes.length);
  }

  function download() {
    if (!codes) return;
    const text = `Rising Star CRM — backup codes\nGenerated ${new Date().toLocaleString()}\nEach code works once.\n\n${codes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rising-star-crm-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className={`rounded-2xl border bg-white p-6 ${highlight && !codes ? 'border-brand-400 ring-2 ring-brand-200' : 'border-gray-200'}`}
    >
      <div className="flex items-start gap-3">
        <KeyRound className="text-gray-500 mt-0.5 shrink-0" size={20} aria-hidden />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-navy-800">Backup codes</h2>
          <p className="text-sm text-gray-600 mt-1">
            Single-use recovery codes for when you lose access to your authenticator. Each code works
            once. Generating a new set invalidates any previous codes.
          </p>

          {!available ? (
            <p className="text-sm text-amber-700 mt-3">
              Backup codes need SUPABASE_SERVICE_ROLE_KEY on the server.
            </p>
          ) : !enabled ? (
            <p className="text-sm text-gray-500 mt-3">Turn on MFA first.</p>
          ) : (
            <>
              {remaining !== null && !codes && (
                <p className="text-sm text-gray-700 mt-3">
                  {remaining > 0 ? `${remaining} unused code${remaining === 1 ? '' : 's'} left.` : 'No backup codes yet.'}
                </p>
              )}

              {codes && (
                <div className="mt-4">
                  <Banner>Save these now — they will not be shown again.</Banner>
                  <ul className="grid grid-cols-2 gap-2 mt-3 font-mono text-sm">
                    {codes.map((c) => (
                      <li key={c} className="rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-center">
                        {c}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      <Copy size={14} aria-hidden /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={download}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      <Download size={14} aria-hidden /> Download
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={generate}
                disabled={busy}
                className="btn-navy rounded-lg px-4 py-2 text-sm mt-4 disabled:opacity-60"
              >
                {busy ? 'Generating…' : remaining ? 'Generate new codes' : 'Generate backup codes'}
              </button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
