import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { SupabaseSetupWizard } from './SupabaseSetupWizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Supabase Setup · Lions CRM' };

export default function SupabaseSetupPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/integrations"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800"
      >
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800 flex items-center gap-2">
          <Database className="text-cyan-500" /> Supabase Setup
        </h1>
        <p className="mt-1 text-gray-600">
          Paste your three Supabase values to verify they all belong to the same active
          project, then save them to Vercel. The wizard never writes the values to disk —
          it only forwards them to Supabase for a one-shot health probe.
        </p>
      </div>

      <SupabaseSetupWizard />
    </div>
  );
}
