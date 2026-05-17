'use client';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Vote, AlertCircle, Clock } from 'lucide-react';

interface TallyRow { option: string; count: number; pct: number }
interface VoterRow { name: string; option: string }

interface Props {
  advisoryId: string;
  options: string[];
  question: string | null;
  closesAt: string | null;
  anonymous: boolean;
}

export function AdvisoryVoteCard({ advisoryId, options, question, closesAt, anonymous }: Props) {
  const [tally, setTally] = useState<TallyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [voters, setVoters] = useState<VoterRow[] | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/advisories/${advisoryId}/vote`, { cache: 'no-store' });
    if (!res.ok) return;
    const j = await res.json();
    setTally(j.tally ?? []);
    setTotal(j.total ?? 0);
    setMyVote(j.myVote ?? null);
    setVoters(j.voters ?? null);
  }

  useEffect(() => { refresh(); }, [advisoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const closed = closesAt ? new Date(closesAt) < new Date() : false;

  function cast(option: string) {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/advisories/${advisoryId}/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_value: option }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      await refresh();
    });
  }

  return (
    <div className="mt-2 bg-blue-50/40 border border-blue-200 rounded-md p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Vote size={12} /> Vote {anonymous && <span className="text-gray-500 normal-case">· anonymous</span>}
        </div>
        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
          {closed ? 'Closed' : closesAt && <><Clock size={10} /> Closes {new Date(closesAt).toLocaleString('en-IN')}</>}
          {total > 0 && <span className="ml-2">· {total} vote{total === 1 ? '' : 's'}</span>}
        </div>
      </div>
      {question && <p className="text-sm font-semibold text-navy-800 mb-2">{question}</p>}

      <div className="space-y-1.5">
        {options.map((opt) => {
          const row = tally.find((t) => t.option === opt);
          const pct = row?.pct ?? 0;
          const count = row?.count ?? 0;
          const mine = myVote === opt;
          return (
            <button key={opt} type="button" onClick={() => cast(opt)} disabled={pending || closed}
              className={`w-full text-left rounded border px-3 py-2 transition-colors relative overflow-hidden ${
                mine ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white hover:border-blue-300'
              } disabled:opacity-70`}>
              <div className="absolute inset-y-0 left-0 bg-blue-100" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between text-sm">
                <span className={mine ? 'font-bold text-blue-700' : 'text-navy-800'}>{opt}</span>
                <span className="text-xs text-gray-600">{count} · {pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {pending && <p className="text-[11px] text-gray-500 mt-1.5 inline-flex items-center gap-1"><Loader2 className="animate-spin" size={10} /> recording…</p>}
      {error && <p className="text-[11px] text-rose-700 inline-flex items-center gap-1 mt-1.5"><AlertCircle size={10} /> {error}</p>}

      {voters && voters.length > 0 && (
        <details className="mt-2">
          <summary className="text-[11px] text-gray-600 cursor-pointer">Show who voted ({voters.length})</summary>
          <ul className="mt-1 text-[11px] text-gray-700 space-y-0.5">
            {voters.map((v, i) => <li key={i}>{v.name} → <span className="font-semibold">{v.option}</span></li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
