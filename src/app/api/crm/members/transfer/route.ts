import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { currentActor, authorize } from '@/lib/rbac';
import { bulkTransferSchema } from '@/lib/validation/schemas';
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

type RowResult = {
  member_id: string;
  name: string | null;
  status: 'transferred' | 'unchanged' | 'duplicate' | 'skipped' | 'forbidden' | 'failed' | 'ready';
  detail?: string;
  from?: string;
};

/**
 * POST /api/crm/members/transfer — bulk transfer to one club.
 *   { member_ids, to_club_id, effective_on?, reason, preview?, batch_id? }
 *
 * Every member is checked against the caller's own scope; a member the
 * caller may not move is reported as `forbidden`, not silently skipped.
 * Each member gets request id `<batch_id>:<member_id>`, so re-sending the
 * same batch after a partial failure only completes the remaining rows.
 */
export async function POST(req: NextRequest) {
  const parsed = bulkTransferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const effectiveOn = input.effective_on || new Date().toISOString().slice(0, 10);
  const reason = input.reason?.trim() ?? '';
  if (!input.preview && !reason) {
    return NextResponse.json({ error: 'A reason for the transfer is required.' }, { status: 400 });
  }
  if (!input.preview && !input.batch_id) {
    return NextResponse.json({ error: 'batch_id is required to apply a bulk transfer.' }, { status: 400 });
  }

  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data: members } = await supa
    .from('members')
    .select('id, name, lions_member_id, club_id, district_id, deleted_at')
    .in('id', input.member_ids);
  const byId = new Map(((members ?? []) as TransferMember[]).map((m) => [m.id, m]));

  const results: RowResult[] = [];
  let toLabel = '';
  for (const memberId of input.member_ids) {
    const m = byId.get(memberId);
    if (!m) { results.push({ member_id: memberId, name: null, status: 'failed', detail: 'Member not found.' }); continue; }
    if (!authorize(actor, 'member.transfer', { club_id: m.club_id, district_id: m.district_id })) {
      results.push({ member_id: m.id, name: m.name, status: 'forbidden', detail: 'Outside your permitted scope.' });
      continue;
    }
    const preview = await buildTransferPreview(supa, m, input.to_club_id, effectiveOn);
    toLabel = placementLabel(preview.to);
    const from = placementLabel(preview.from);
    if (preview.blockers.length) {
      const already = m.club_id === input.to_club_id;
      results.push({ member_id: m.id, name: m.name, from, status: already ? 'unchanged' : 'skipped', detail: preview.blockers[0] });
      continue;
    }
    if (input.preview) {
      results.push({ member_id: m.id, name: m.name, from, status: 'ready', detail: preview.warnings.join(' ') || undefined });
      continue;
    }
    try {
      const out = await executeTransfer(supa, {
        memberId: m.id, toClubId: input.to_club_id, effectiveOn, reason,
        actorMemberId: actor.member_id ?? null, source: 'bulk',
        requestId: `${input.batch_id}:${m.id}`,
      });
      results.push({ member_id: m.id, name: m.name, from, status: out.status });
      if (out.status === 'transferred') {
        await writeAudit({
          action: 'member.transfer',
          entity: 'member',
          entity_id: m.id,
          actor_user_id: actor.user_id,
          actor_member_id: actor.member_id ?? null,
          request_id: `${input.batch_id}:${m.id}`,
          payload: {
            bulk: true, lions_member_id: m.lions_member_id, from: preview.from, to: preview.to,
            effective_on: effectiveOn, lions_year: preview.lions_year, reason,
            history_recorded: out.history_recorded,
          },
        });
      }
    } catch (err) {
      const detail = err instanceof TransferError ? err.message : 'Unexpected error.';
      results.push({ member_id: m.id, name: m.name, from, status: 'failed', detail });
    }
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  if (!input.preview) {
    if (summary.transferred) refreshDirectoryCaches();
    await writeAudit({
      action: 'member.transfer.bulk',
      entity: 'club',
      entity_id: input.to_club_id,
      actor_user_id: actor.user_id,
      actor_member_id: actor.member_id ?? null,
      request_id: input.batch_id ?? null,
      payload: { effective_on: effectiveOn, reason, summary },
    });
    const problems = (summary.failed ?? 0) + (summary.forbidden ?? 0) + (summary.skipped ?? 0);
    if (summary.transferred || problems) {
      await notifyAdmins(supa, {
        title: problems ? 'Bulk transfer finished with problems' : 'Bulk transfer completed',
        body: `${summary.transferred ?? 0} moved to ${toLabel}` + (problems ? `, ${problems} not moved` : ''),
        url: '/admin/members',
        tag: `member-transfer-bulk-${input.batch_id}`,
      });
    }
  }

  return NextResponse.json({ ok: true, preview: !!input.preview, to: toLabel, summary, results });
}
