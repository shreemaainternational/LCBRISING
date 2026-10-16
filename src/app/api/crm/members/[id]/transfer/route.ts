import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { transferSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';
import {
  buildTransferPreview,
  executeTransfer,
  notifyAdmins,
  placementLabel,
  refreshDirectoryCaches,
  TransferError,
  type TransferMember,
} from '@/lib/org-hierarchy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/crm/members/[id]/transfer
 *   { to_club_id, effective_on?, reason, preview?: true, request_id? }
 *
 * preview: true returns the before/after club, zone, region and district
 * plus blockers and warnings, and changes nothing. Without it the transfer
 * is applied (blockers refuse it). The member's zone, region and district
 * are derived from the target club — never taken from the request.
 * Retrying with the same request_id is a no-op.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = transferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const effectiveOn = input.effective_on || new Date().toISOString().slice(0, 10);

  // Trusted admin write (gated by requirePermission below). Service-role client
  // so member reads/writes bypass RLS and avoid the members-policy recursion.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data: member } = await supa
    .from('members')
    .select('id, name, lions_member_id, club_id, district_id, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('member.transfer', {
    club_id: member.club_id ?? null,
    district_id: member.district_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  const preview = await buildTransferPreview(supa, member as TransferMember, input.to_club_id, effectiveOn);
  if (input.preview) return NextResponse.json({ preview });

  if (preview.blockers.length) {
    return NextResponse.json({ error: preview.blockers[0], preview }, { status: 400 });
  }
  const reason = input.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: 'A reason for the transfer is required.', preview }, { status: 400 });
  }

  let outcome;
  try {
    outcome = await executeTransfer(supa, {
      memberId: id,
      toClubId: input.to_club_id,
      effectiveOn,
      reason,
      actorMemberId: actor.member_id ?? null,
      source: 'transfer',
      requestId: input.request_id ?? null,
    });
  } catch (err) {
    if (err instanceof TransferError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  if (outcome.status === 'transferred') {
    refreshDirectoryCaches();
    await writeAudit({
      action: 'member.transfer',
      entity: 'member',
      entity_id: id,
      actor_user_id: actor.user_id,
      actor_member_id: actor.member_id ?? null,
      request_id: input.request_id ?? null,
      payload: {
        lions_member_id: member.lions_member_id,
        from: preview.from,
        to: preview.to,
        effective_on: effectiveOn,
        lions_year: preview.lions_year,
        reason,
        history_recorded: outcome.history_recorded,
      },
    });
    await notifyAdmins(supa, {
      title: 'Member transferred',
      body: `${member.name}: ${placementLabel(preview.from)} → ${placementLabel(preview.to)}`,
      url: '/admin/members',
      tag: `member-transfer-${id}`,
    });
  }

  return NextResponse.json({ ok: true, ...outcome, preview });
}
