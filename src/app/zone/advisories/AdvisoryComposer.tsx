'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  zoneId: string;
  districtId: string;
  clubs: { id: string; name: string }[];
  initialClubId: string | null;
}

export function AdvisoryComposer({ zoneId, districtId, clubs, initialClubId }: Props) {
  const router = useRouter();
  const [clubId, setClubId] = useState(initialClubId ?? '');
  const [priority, setPriority] = useState<'info' | 'warning' | 'critical'>('warning');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [action, setAction] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [votingEnabled, setVotingEnabled] = useState(false);
  const [votingQuestion, setVotingQuestion] = useState('');
  const [votingOptionsRaw, setVotingOptionsRaw] = useState('Yes\nNo');
  const [votingClosesAt, setVotingClosesAt] = useState('');
  const [votingAnonymous, setVotingAnonymous] = useState(false);

  function submit() {
    setResult(null);
    if (!subject.trim() || !body.trim()) {
      setResult({ ok: false, msg: 'Subject and message are required' });
      return;
    }
    const votingOptions = votingOptionsRaw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (votingEnabled && votingOptions.length < 2) {
      setResult({ ok: false, msg: 'Voting needs at least 2 options.' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/zone/advisories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          district_id: districtId,
          club_id: clubId || null,
          priority,
          subject, body,
          action_required: action || null,
          voting_enabled: votingEnabled,
          voting_question: votingEnabled ? (votingQuestion || subject) : undefined,
          voting_options: votingEnabled ? votingOptions : undefined,
          voting_closes_at: votingEnabled && votingClosesAt ? new Date(votingClosesAt).toISOString() : undefined,
          voting_anonymous: votingEnabled ? votingAnonymous : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      setResult({ ok: true, msg: 'Advisory sent.' });
      setSubject(''); setBody(''); setAction('');
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="font-semibold text-navy-800 mb-3 inline-flex items-center gap-2">
        <Send size={14} className="text-amber-500" />
        Compose advisory
      </h3>
      <div className="space-y-3">
        <Field label="Club">
          <select value={clubId} onChange={(e) => setClubId(e.target.value)} className={cls}>
            <option value="">Zone-wide</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={cls}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={cls} placeholder="Low attendance — action required" />
        </Field>
        <Field label="Message">
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={cls}
            placeholder="Hi Club Secretary, our records show…" />
        </Field>
        <Field label="Action required (optional)">
          <input value={action} onChange={(e) => setAction(e.target.value)} className={cls}
            placeholder="Submit attendance log by next Monday" />
        </Field>

        <div className="border-t pt-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800">
            <input type="checkbox" checked={votingEnabled} onChange={(e) => setVotingEnabled(e.target.checked)} />
            Attach a vote
          </label>
          {votingEnabled && (
            <div className="mt-2 space-y-2 pl-5 border-l-2 border-blue-200">
              <Field label="Question (optional — falls back to subject)">
                <input value={votingQuestion} onChange={(e) => setVotingQuestion(e.target.value)} className={cls}
                  placeholder="Do you agree to the proposed resolution?" />
              </Field>
              <Field label="Options (one per line, 2–8)">
                <textarea rows={3} value={votingOptionsRaw} onChange={(e) => setVotingOptionsRaw(e.target.value)} className={cls} />
              </Field>
              <Field label="Closes at (optional)">
                <input type="datetime-local" value={votingClosesAt} onChange={(e) => setVotingClosesAt(e.target.value)} className={cls} />
              </Field>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={votingAnonymous} onChange={(e) => setVotingAnonymous(e.target.checked)} />
                Anonymous (voters not shown)
              </label>
            </div>
          )}
        </div>

        <button type="button" onClick={submit} disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          {pending ? 'Sending…' : 'Send Advisory'}
        </button>

        {result?.ok && <p className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={12} /> {result.msg}</p>}
        {result && !result.ok && <p className="text-xs text-rose-700 inline-flex items-center gap-1"><AlertCircle size={12} /> {result.msg}</p>}
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
