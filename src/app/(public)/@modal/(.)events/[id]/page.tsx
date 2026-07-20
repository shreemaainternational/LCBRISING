import { notFound } from 'next/navigation';
import { getPublicEventById } from '@/lib/events';
import { Modal } from '@/components/site/Modal';
import { EventReport } from '@/components/site/EventReport';

export const dynamic = 'force-dynamic';

export default async function EventModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) notFound();
  return (
    <Modal>
      <EventReport event={event} />
    </Modal>
  );
}
