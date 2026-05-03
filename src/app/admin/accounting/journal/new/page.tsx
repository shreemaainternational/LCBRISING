import { JournalEntryForm } from './JournalEntryForm';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function NewJournalPage() {
  let accounts: { id: string; code: string; name: string; type: string }[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('accounts').select('id, code, name, type').eq('is_active', true).order('code');
    accounts = (data ?? []) as typeof accounts;
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-6">New Journal Entry</h1>
      <JournalEntryForm accounts={accounts} />
    </div>
  );
}
