import { notFound } from 'next/navigation';
import { getActivityReport } from '@/lib/activities';
import { Modal } from '@/components/site/Modal';
import { ActivityReport } from '@/components/site/ActivityReport';

export const dynamic = 'force-dynamic';

export default async function ActivityReportModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getActivityReport(id);
  if (!a) notFound();
  return (
    <Modal>
      <ActivityReport activity={a} />
    </Modal>
  );
}
