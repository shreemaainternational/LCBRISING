import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { EventEditForm, type EventInitial } from './EventEditForm';

export const dynamic = 'force-dynamic';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { data: e, error } = await createAdminClient()
    .from('events').select('*').eq('id', id).maybeSingle();
  if (error || !e) notFound();

  const initial: EventInitial = {
    id: e.id,
    title: e.title ?? '',
    category: e.category ?? null,
    date: e.date ?? '',
    end_date: e.end_date ?? null,
    location: e.location ?? null,
    capacity: e.capacity ?? null,
    is_public: e.is_public ?? true,
    cover_url: e.cover_url ?? null,
    description: e.description ?? null,
  };

  return <EventEditForm initial={initial} />;
}
