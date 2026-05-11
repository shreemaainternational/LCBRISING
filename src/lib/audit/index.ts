import { createAdminClient } from '@/lib/supabase/server';

export type AuditEntry = {
  action: string;
  entity?: string | null;
  entity_id?: string | null;
  actor_user_id?: string | null;
  actor_member_id?: string | null;
  actor_label?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  payload?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
};

/**
 * Append an audit log entry. Best-effort: never throws so callers can use
 * this on the happy path without try/catch. Logs are written via the
 * service-role client so RLS does not block inserts.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[audit:noop]', entry.action, entry.entity, entry.payload);
    }
    return;
  }
  try {
    const supa = createAdminClient();
    await supa.from('audit_logs').insert(entry);
  } catch (err) {
    console.error('[audit:write_failed]', err);
  }
}
