import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { scanDuplicates } from '@/lib/sync/dedupe';
import { integrations } from '@/lib/env';
import { ArrowLeft, Bot, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ ai?: string }>; }

export default async function DuplicatesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const useAi = sp.ai === '1';
  const pairs = await scanDuplicates({ ai: useAi, max: 25 });

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/sync" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Sync
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2">
            <Bot className="text-purple-500" /> Duplicate Detector
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Rule-based candidate pairs from shared emails, phones, and name+club matches.
            {integrations.openai ? ' Toggle AI to ask gpt-4o-mini to confirm each pair.' :
              ' Add OPENAI_API_KEY in env to enable AI confirmation.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {integrations.openai && (
            <Link href={useAi ? '/admin/sync/duplicates' : '/admin/sync/duplicates?ai=1'}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold ${
                useAi ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}>
              <Bot size={14} /> AI {useAi ? 'on' : 'off'}
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Candidate pairs ({pairs.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {pairs.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No duplicate candidates detected.
            </div>
          ) : (
            <ul className="divide-y">
              {pairs.map((p, i) => (
                <li key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.matchers.map((m) => (
                        <span key={m} className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {m}
                        </span>
                      ))}
                      <span className="text-xs text-gray-600">rule score <strong>{p.ruleScore}</strong></span>
                    </div>
                    {p.ai && (
                      <div className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                        p.ai.isDuplicate
                          ? p.ai.confidence >= 70 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Bot size={11} /> AI: {p.ai.isDuplicate ? 'Duplicate' : 'Distinct'} · {p.ai.confidence}%
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MemberCard m={p.left} />
                    <MemberCard m={p.right} />
                  </div>
                  {p.ai?.reason && (
                    <p className="mt-2 text-xs text-gray-600 italic border-l-2 border-purple-200 pl-3">
                      {p.ai.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pairs.length === 25 && (
        <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
          <AlertTriangle size={12} /> Showing first 25 — more candidates may exist.
        </p>
      )}
    </div>
  );
}

function MemberCard({ m }: { m: { id: string; name: string | null; email: string | null; phone: string | null; club_id: string | null; lions_member_id: string | null } }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="font-semibold text-navy-800 text-sm">{m.name ?? '—'}</div>
      <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
        {m.email && <div>{m.email}</div>}
        {m.phone && <div>{m.phone}</div>}
        {m.lions_member_id && <div>Lions ID: {m.lions_member_id}</div>}
        <div className="font-mono text-[10px] text-gray-400">{m.id.slice(0, 8)}…</div>
      </div>
    </div>
  );
}
