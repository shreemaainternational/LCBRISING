# Phase 3 — Sync Engine

A pluggable, audited synchronization engine that pulls authorized Lions
data into the local CRM database.

## Concepts

- **Source** — where the data comes from (`csv`, `excel`, `rest_api`,
  `lions_oidc`, `webhook`, `manual`).
- **Entity** — the table being synchronized (`members`, `clubs`,
  `districts`, `officers`, `attendance`, `awards`, `trainings`).
- **Adapter** — one implementation per (source, entity) pair.
- **Runner** — owns the lifecycle: creates a `sync_logs` row, invokes
  the adapter, updates the row with counts, emits audit events.

## Endpoints

| Method | Path              | Body / Form                                                                | Permission         |
|--------|-------------------|----------------------------------------------------------------------------|--------------------|
| POST   | `/api/sync/run`   | `{ source, entity, payload?, integration_id?, cursor? }` (JSON)           | `sync.trigger`     |
| POST   | `/api/sync/csv`   | multipart `entity=members\|clubs`, `file=<csv>`                            | `sync.trigger`     |
| GET    | `/api/sync/logs`  | query `?entity=&limit=`                                                    | `sync.configure`   |

## Built-in adapters

| Source     | Entity   | Notes                                                  |
|------------|----------|--------------------------------------------------------|
| `csv`      | `members`| Columns: `email,name,phone,whatsapp,lions_member_id,club_id,district_id,lions_role,birthday`. Idempotent on `email`. |
| `csv`      | `clubs`  | Columns: `name,club_number,district_id,zone_id,region_id,district,city,state,country,source_id`. Idempotent on `club_number`/`source_id`/`name`. |
| `rest_api` | `members`| Paginated JSON via `endpoint` + `bearer_token` in payload. Idempotent on `lions_member_id`. |

## Adding an adapter

```ts
import type { SyncAdapter } from '@/lib/sync';
import { registerAdapter } from '@/lib/sync';

export const myAdapter: SyncAdapter = {
  source: 'rest_api',
  entity: 'awards',
  async run({ logId, job }) {
    // fetch, transform, upsert
    return { total, inserted, updated, skipped, failed, failures };
  },
};

registerAdapter(myAdapter);
```

Then import it from `src/lib/sync/index.ts` so it registers at module load.

## Sync log lifecycle

```
queued ──▶ running ──▶ success
                  └─▶ partial   (some rows succeeded, some failed)
                  └─▶ failed    (no rows succeeded, or thrown error)
```

Every transition appends an audit log entry: `sync.start`,
`sync.success`, `sync.partial`, or `sync.failed`.

## Retry policy

The runner itself does **not** retry. Cron jobs (`/api/cron/automation`)
can re-enqueue failed sync_logs by their id; this keeps the retry
contract explicit and observable.
