import Link from 'next/link';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { checkSupabaseHealth, diagnoseSupabase } from '@/lib/supabase/health';

export async function SupabaseHealthBanner() {
  const h = await checkSupabaseHealth();
  if (h.consistent) return null;
  const message = diagnoseSupabase(h);
  if (!message) return null;

  const details = [
    h.anon.error && `anon: ${h.anon.error}`,
    h.serviceRole?.error && `service: ${h.serviceRole.error}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-rose-900 text-sm">
            Database connection problem
          </div>
          <p className="mt-1 text-xs text-rose-800 leading-relaxed">{message}</p>
          {details && (
            <details className="mt-2 text-[11px] text-rose-700">
              <summary className="cursor-pointer font-medium">Details</summary>
              <code className="mt-1 block whitespace-pre-wrap break-all font-mono text-[11px]">
                {details}
              </code>
            </details>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/integrations"
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
            >
              Integration health
            </Link>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
            >
              Supabase dashboard <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
