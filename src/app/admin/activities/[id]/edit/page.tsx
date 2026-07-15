import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { ActivityEditForm, type ActivityInitial } from './ActivityEditForm';

export const dynamic = 'force-dynamic';

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: a, error } = await createAdminClient()
    .from('activities').select('*').eq('id', id).maybeSingle();
  if (error || !a) notFound();

  const initial: ActivityInitial = {
    id: a.id,
    title: a.title ?? '',
    category: a.category ?? null,
    date: a.date ?? '',
    location: a.location ?? null,
    description: a.description ?? null,
    status: a.status ?? null,
    beneficiaries: a.beneficiaries ?? 0,
    service_hours: a.service_hours == null ? 0 : Number(a.service_hours),
    lion_members_count: a.lion_members_count ?? 0,
    leo_members_count: a.leo_members_count ?? 0,
    guest_count: a.guest_count ?? 0,
    amount_raised: a.amount_raised == null ? 0 : Number(a.amount_raised),
    budget: a.budget == null ? 0 : Number(a.budget),
    expenses: a.expenses == null ? 0 : Number(a.expenses),
    sponsorship_amount: a.sponsorship_amount == null ? 0 : Number(a.sponsorship_amount),
    photos: a.photos ?? [],
    before_photos: a.before_photos ?? [],
    after_photos: a.after_photos ?? [],
    videos: a.videos ?? [],
    photo_captions: a.photo_captions ?? {},
  };

  return <ActivityEditForm initial={initial} />;
}
