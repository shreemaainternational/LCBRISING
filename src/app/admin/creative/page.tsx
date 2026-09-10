import { CreativeBuilder } from './CreativeBuilder';
import { loadCanvaRuntime } from '@/lib/canva/config';

export const dynamic = 'force-dynamic';

export default async function CreativePage() {
  const canva = await loadCanvaRuntime(true).catch(() => ({ connected: false }));
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Creative Builder</h1>
      <p className="text-gray-600 mb-8">
        Generate captions, flyers, invitations, certificates and short
        video scripts with AI + Canva, then publish to every connected
        social channel in one click.
      </p>
      <CreativeBuilder canvaConnected={canva.connected} />
    </div>
  );
}
