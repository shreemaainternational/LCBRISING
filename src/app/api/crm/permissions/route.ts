import { NextResponse } from 'next/server';
import { currentActor, permissionsFor } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/** Returns the current actor's role + every permission they hold. */
export async function GET() {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  return NextResponse.json({
    actor: {
      member_id: actor.member_id,
      club_id: actor.club_id,
      district_id: actor.district_id,
      role: actor.role,
    },
    permissions: permissionsFor(actor.role),
  });
}
