'use client';
import { useEffect, useState } from 'react';
import { CalendarPlus, Copy, CheckCircle2 } from 'lucide-react';

export function SubscribeButtons({ year }: { year: string }) {
  const [host, setHost] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setHost(window.location.host); }, []);

  const httpsUrl = host ? `https://${host}/api/zone/lions-year.ics?year=${year}` : '';
  const webcalUrl = host ? `webcal://${host}/api/zone/lions-year.ics?year=${year}` : '';

  async function copy() {
    try { await navigator.clipboard.writeText(httpsUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  }

  return (
    <>
      <a
        href={webcalUrl || `/api/zone/lions-year.ics?year=${year}`}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        title="Subscribe in Apple Calendar / Google Calendar / Outlook"
      >
        <CalendarPlus size={13} /> Subscribe
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border text-sm font-semibold text-gray-700 hover:bg-gray-50"
        title="Copy subscription URL"
      >
        {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy URL'}
      </button>
    </>
  );
}
