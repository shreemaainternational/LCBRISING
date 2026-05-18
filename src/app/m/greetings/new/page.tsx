import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { ChevronLeft } from 'lucide-react';
import { GreetingComposer } from './GreetingComposer';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ for?: string; occasion?: string }> }

export default async function NewGreetingPage({ searchParams }: Props) {
  const { for: forId, occasion } = await searchParams;
  const db = createAdminClient();

  const { data: members } = await db.from('members')
    .select('id, name, phone, birthday')
    .is('deleted_at', null)
    .order('name');

  const initial = forId
    ? (members ?? []).find((m) => m.id === forId) ?? null
    : null;

  return (
    <div className="space-y-4 -mt-2">
      <header className="flex items-center gap-2 mb-2">
        <Link href="/m/greetings" className="text-gray-600 -ml-1 p-1">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-navy-900">AI Greeting Generator</h1>
      </header>

      <GreetingComposer
        members={(members ?? []).map((m) => ({
          id: m.id, name: m.name, phone: m.phone,
          birthday: m.birthday,
        }))}
        initialRecipientId={initial?.id ?? null}
        initialOccasion={(occasion as 'birthday' | 'anniversary' | 'award' | 'festival' | 'event' | 'achievement' | 'thank_you' | 'condolence') ?? null}
      />
    </div>
  );
}
