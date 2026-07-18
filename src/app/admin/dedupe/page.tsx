import { GitMerge } from 'lucide-react';
import { DedupeManager } from '@/components/admin/DedupeManager';
import { scanAllDuplicates } from '@/lib/dedupe/scan';

export const dynamic = 'force-dynamic';

export default async function DedupePage() {
  const data = await scanAllDuplicates();
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2 mb-1">
        <GitMerge className="text-amber-500" /> Find &amp; Merge Duplicates
      </h1>
      <p className="text-gray-600 mb-6">
        Detects duplicate members (shared email/phone/name+club), service activities and events
        (same title, date and club). Review each pair and merge.
      </p>
      <DedupeManager initial={data} />
    </div>
  );
}
