'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  invoiceId: string;
  invoiceNo: string;
  amount: number;
  upiString: string;
  upiVpa: string;
  payeeName: string;
  qrSvg: string;
  staticQrUrl: string | null;
  expiresAt: string | null;
  phonepeIntent: string;
  gpayIntent: string;
  paytmIntent: string;
  description: string | null;
  invoicePdfUrl: string;
  phonepePgAvailable: boolean;
};

type OcrInfo = {
  utr: string | null;
  amount: number | null;
  confidence: 'high' | 'medium' | 'low';
  app: string | null;
};

type ProofState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'submitted'; proofId: string; ocr: OcrInfo | null }
  | { kind: 'error'; message: string };

export function PaymentClient(props: Props) {
  const [tab, setTab] = useState<'qr' | 'upi'>('qr');
  const [copied, setCopied] = useState(false);
  const [proof, setProof] = useState<ProofState>({ kind: 'idle' });
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'paid' | 'rejected' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = useCountdown(props.expiresAt);

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (proof.kind !== 'submitted') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${props.invoiceId}`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          invoice_status: string;
          proofs: { id: string; status: string }[];
        };
        if (json.invoice_status === 'paid') {
          setPollingStatus('paid');
          clearInterval(interval);
          setTimeout(() => window.location.reload(), 1200);
        }
        const last = json.proofs.find((p) => p.id === proof.proofId);
        if (last?.status === 'rejected') {
          setPollingStatus('rejected');
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [proof, props.invoiceId]);

  async function copyVpa() {
    await navigator.clipboard.writeText(props.upiVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadQr() {
    const url = props.qrSvg
      ? `/api/qr/${props.invoiceId}?format=png`
      : props.staticQrUrl;
    if (url) window.open(url, '_blank');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProof({ kind: 'submitting' });
    const form = new FormData(e.currentTarget);
    form.set('invoice_id', props.invoiceId);
    try {
      const res = await fetch('/api/payments/proof', { method: 'POST', body: form });
      const json = (await res.json()) as {
        ok?: boolean;
        proof_id?: string;
        ocr?: OcrInfo | null;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.proof_id) {
        setProof({ kind: 'error', message: json.error ?? 'Submission failed' });
        return;
      }
      setProof({ kind: 'submitted', proofId: json.proof_id, ocr: json.ocr ?? null });
      setPollingStatus('pending');
    } catch {
      setProof({ kind: 'error', message: 'Network error' });
    }
  }

  const [phonepeBusy, setPhonepeBusy] = useState(false);
  const [phonepeError, setPhonepeError] = useState<string | null>(null);

  async function payWithPhonePePG() {
    setPhonepeBusy(true);
    setPhonepeError(null);
    try {
      const res = await fetch(`/api/invoices/${props.invoiceId}/phonepe`, { method: 'POST' });
      const json = (await res.json()) as { redirect_url?: string; error?: string };
      if (!res.ok || !json.redirect_url) {
        setPhonepeError(json.error ?? 'failed to start PhonePe');
        return;
      }
      window.location.href = json.redirect_url;
    } catch {
      setPhonepeError('network error');
    } finally {
      setPhonepeBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {remaining !== null && (
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium">
            Expires in {formatRemaining(remaining)}
          </span>
        </div>
      )}

      {props.phonepePgAvailable && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={payWithPhonePePG}
            disabled={phonepeBusy}
            className="w-full h-12 rounded-lg bg-[#5f259f] text-white font-semibold text-sm disabled:opacity-60 hover:bg-[#4c1d87]"
          >
            {phonepeBusy ? 'Opening PhonePe…' : 'Pay with PhonePe (auto-verify)'}
          </button>
          {phonepeError && <p className="text-xs text-red-600 text-center">{phonepeError}</p>}
          <p className="text-[11px] text-gray-500 text-center">
            Recommended — payment confirms automatically, no manual proof needed.
          </p>
          <div className="text-center text-xs text-gray-400">— or scan the QR below —</div>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-lg p-1">
        <TabBtn active={tab === 'qr'} onClick={() => setTab('qr')}>Scan QR</TabBtn>
        <TabBtn active={tab === 'upi'} onClick={() => setTab('upi')}>UPI ID / Apps</TabBtn>
      </div>

      {tab === 'qr' ? (
        <div className="space-y-3">
          {props.qrSvg ? (
            <div
              className="bg-white border-2 border-purple-100 rounded-2xl p-4 mx-auto"
              style={{ width: 260, height: 260 }}
              dangerouslySetInnerHTML={{ __html: props.qrSvg.replace('<svg ', '<svg width="100%" height="100%" ') }}
            />
          ) : props.staticQrUrl ? (
            <div className="bg-white border-2 border-purple-100 rounded-2xl p-4 mx-auto" style={{ width: 260, height: 260 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.staticQrUrl} alt="PhonePe QR" className="w-full h-full object-contain" />
            </div>
          ) : null}
          {!props.qrSvg && props.staticQrUrl && (
            <p className="text-center text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1">
              Static QR — enter ₹{props.amount.toLocaleString('en-IN')} manually and include
              invoice {props.invoiceNo} in the note when paying.
            </p>
          )}
          <p className="text-center text-xs text-gray-500">
            Open PhonePe, GPay, Paytm, or any UPI app and scan this QR.
          </p>
          <button
            type="button"
            onClick={downloadQr}
            className="w-full h-10 rounded-md border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50"
          >
            Download QR
          </button>
        </div>
      ) : !props.upiString ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            Use the QR tab — UPI deep links are not configured yet.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-xs text-purple-700 uppercase tracking-wide">UPI ID</div>
            <div className="font-mono text-sm text-purple-900 mt-1 break-all">{props.upiVpa}</div>
            <button
              type="button"
              onClick={copyVpa}
              className="mt-3 w-full h-9 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
            >
              {copied ? 'Copied ✓' : 'Copy UPI ID'}
            </button>
          </div>
          {isMobile && (
            <div className="grid grid-cols-3 gap-2">
              <AppLink href={props.phonepeIntent} label="PhonePe" color="#5f259f" />
              <AppLink href={props.gpayIntent} label="GPay" color="#1a73e8" />
              <AppLink href={props.paytmIntent} label="Paytm" color="#00BAF2" />
            </div>
          )}
          <a
            href={props.upiString}
            className="block w-full h-11 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center"
          >
            Open in any UPI app
          </a>
          <p className="text-xs text-gray-500 text-center">
            On desktop the link does nothing — use the QR with your phone instead.
          </p>
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">After paying, share your proof</h3>
        {proof.kind === 'submitted' ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              {pollingStatus === 'paid'
                ? 'Verified! Reloading…'
                : pollingStatus === 'rejected'
                ? 'Your proof was rejected. Please re-check the UTR / screenshot and submit again.'
                : 'Submitted — our team will verify within minutes. This page will update automatically.'}
            </div>
            {proof.ocr && (proof.ocr.utr || proof.ocr.amount) && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900">
                <div className="font-medium mb-1">Auto-extracted from screenshot:</div>
                {proof.ocr.app && <div>App: {proof.ocr.app}</div>}
                {proof.ocr.utr && <div>UTR: <span className="font-mono">{proof.ocr.utr}</span></div>}
                {proof.ocr.amount && <div>Amount: ₹{proof.ocr.amount.toLocaleString('en-IN')}</div>}
                <div className="opacity-60 mt-1">Confidence: {proof.ocr.confidence}</div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="block text-xs text-gray-600">UTR / Transaction reference</label>
            <input
              name="utr"
              placeholder="e.g. 432198765432"
              className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <label className="block text-xs text-gray-600">
              Or upload a screenshot (PNG/JPG/PDF, max 5MB) — we&apos;ll auto-detect the UTR
            </label>
            <input
              ref={fileRef}
              name="screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="block w-full text-sm"
            />
            <label className="block text-xs text-gray-600">Notes (optional)</label>
            <input
              name="notes"
              placeholder="Anything we should know?"
              className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              disabled={proof.kind === 'submitting'}
              className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {proof.kind === 'submitting' ? 'Submitting…' : 'Submit proof'}
            </button>
            {proof.kind === 'error' && (
              <p className="text-xs text-red-600">{proof.message}</p>
            )}
          </form>
        )}
      </div>

      {props.description && (
        <p className="text-xs text-gray-500 text-center border-t pt-3">
          {props.description}
        </p>
      )}

      <a
        href={props.invoicePdfUrl}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-xs text-purple-700 hover:underline"
      >
        Download invoice (PDF)
      </a>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-9 text-sm font-medium rounded-md transition ${
        active ? 'bg-white text-purple-700 shadow' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function AppLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      className="h-10 rounded-md text-white text-xs font-semibold flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      {label}
    </a>
  );
}

function useCountdown(expiresAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  return Math.max(0, Math.floor(ms / 1000));
}

function formatRemaining(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
