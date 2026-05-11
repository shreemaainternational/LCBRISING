# Admin Manual

Operations runbook for the enterprise CRM. Intended for District
Governors, Cabinet Officers, Multiple-District Admins, and the
International Admin role.

## Daily ops

| Task                          | Where                                  |
|-------------------------------|----------------------------------------|
| Inspect sync runs             | `GET /api/sync/logs` (or admin UI)     |
| Trigger an ad-hoc sync        | `POST /api/sync/run` / CSV upload      |
| Read the audit log            | `GET /api/crm/audit`                   |
| Federation snapshot           | `GET /api/crm/analytics`               |
| Club briefing (AI)            | `GET /api/crm/clubs/:id/insights`      |
| Manage integrations           | `GET/POST /api/crm/integrations`       |

## Adding a new district

```sql
insert into public.districts (code, name, multiple_district_id, lions_year)
values ('3234-A1', 'District 3234-A1', '<MD UUID>', '2025-26');
```

Then assign officers via `POST /api/crm/clubs/:id/officers` or directly
through the Officers table for non-club scopes.

## Onboarding a new club

1. `POST /api/crm/clubs` with `district_id`, `zone_id`, etc.
2. Bulk-import members: `POST /api/sync/csv` with `entity=members`.
3. Assign the inaugural officers (president, secretary, treasurer).

## Rotating Lions OIDC credentials

1. Generate a new client secret on the IdP side.
2. Update Vercel env vars (`LIONS_OIDC_CLIENT_SECRET`).
3. Trigger a redeploy. Existing user sessions remain valid (they use
   the local session cookie, not the upstream credential).
4. The old secret can be revoked once the new one is in place.

## Recovering from a failed sync

1. `GET /api/sync/logs?entity=members` and find the failed run.
2. Inspect `error_message` and `context.failures`.
3. Fix the upstream issue (bad CSV row, API outage, schema mismatch).
4. Re-run with `POST /api/sync/run` — adapters are idempotent.

## Permission audits

```bash
curl -H 'cookie: <admin>' /api/crm/audit?action=rbac.denied | jq .
```

Investigate spikes in `rbac.denied` to surface privilege errors before
they become support tickets.

## Backups

- Supabase: enable PITR in the dashboard (paid tier).
- Storage: each PDF receipt is regenerable from `donations` + `payments`.
- Audit and sync logs are append-only and inherently durable.
