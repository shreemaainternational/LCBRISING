# Sync Workflow Diagrams

ASCII (paste-into-any-tool) versions of the sync flows that ship in
`src/lib/sync`.

## 1. OIDC login → member upsert

```
 Browser ──▶ /api/auth/oidc/login
                │  generates PKCE + state + nonce; sets cookies
                ▼
       Lions IdP (authorization_endpoint)
                │  user authenticates
                ▼
 Browser ──▶ /api/auth/oidc/callback?code=...&state=...
                │
                ├── verify state cookie
                ├── exchange code → tokens (PKCE proof)
                ├── verifyIdToken() — JWKS, iss, aud, exp, nonce
                ├── fetchUserInfo()
                ├── upsertOAuthAccount()
                │       └─ link by lions_member_id, then by email
                │       └─ promote claims onto members
                ├── createSession() → oauth_sessions row + cookie
                └── writeAudit('oauth.login')
                ▼
        redirect → /admin
```

## 2. CSV import (members)

```
 Officer (RBAC: sync.trigger)
        │
        ▼
 POST /api/sync/csv  (multipart: entity=members, file=*.csv)
        │
        ▼
 runSyncJob() ──┬─▶ INSERT sync_logs (status='running')
                │
                ▼
        csvMembersAdapter.run()
                │
                ▼  per row:
        Zod validate ─┬─ ok ─▶ supabase.upsert(members, on email)
                      └─ fail ─▶ failures.push({row, reason})
                │
                ▼
        UPDATE sync_logs SET
            status, finished_at,
            records_total/inserted/updated/skipped/failed,
            context.failures
        writeAudit('sync.success' | 'sync.partial' | 'sync.failed')
```

## 3. REST sync (paginated members)

```
 Cron / Officer
        │
        ▼
 POST /api/sync/run { source:'rest_api', entity:'members',
                     payload: { endpoint, bearer_token, page_size } }
        │
        ▼
 restMembersAdapter.run()
        │
        ▼  while next_cursor exists:
        fetch endpoint?cursor=...&page_size=...
        for each item: upsert by lions_member_id
        │
        ▼
 sync_logs.cursor ← last next_cursor
```

## 4. Officer appointment notification

```
 POST /api/crm/clubs/:id/officers
        │  (officer.appoint, scope-bound)
        ▼
 INSERT officers
 writeAudit('officer.appoint')
        │
        ▼ enqueue
 automation_jobs.insert({ job_type:'notify_officer_appointment',
                          payload:{ officer_id } })
        │
        ▼ next cron tick
 engine handler → email + WhatsApp to the appointee
 logComm() row inserted
```
