import type { SyncSourceKind } from '@/lib/supabase/database.types';

export type SyncEntity =
  | 'members'
  | 'clubs'
  | 'districts'
  | 'officers'
  | 'attendance'
  | 'awards'
  | 'trainings'
  | 'donations'
  | 'activities'
  | 'events';

export type SyncJobInput = {
  source: SyncSourceKind;
  entity: SyncEntity;
  triggered_by?: string | null;
  integration_id?: string | null;
  payload?: Record<string, unknown>;
  cursor?: string | null;
};

export type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { row: number; reason: string }[];
  next_cursor?: string | null;
};

export type SyncContext = {
  logId: string;
  job: SyncJobInput;
};

/** Adapter contract — one per (source, entity) pair. */
export type SyncAdapter = {
  source: SyncSourceKind;
  entity: SyncEntity;
  run(ctx: SyncContext): Promise<SyncResult>;
};
