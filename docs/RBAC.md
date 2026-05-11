# Phase 2 — RBAC

Federation-wide role-based access control. Twelve Lions roles plus a
guest tier, each with a defined scope (international → club → self) and
a permission matrix.

## Roles (most → least privileged)

| Rank | Role                     | Scope             |
|------|--------------------------|-------------------|
| 0    | `international_admin`    | international     |
| 1    | `multiple_district_admin`| multiple_district |
| 2    | `district_governor`      | district          |
| 3    | `vice_district_governor` | district          |
| 4    | `cabinet_officer`        | district          |
| 5    | `region_chairperson`     | region            |
| 6    | `zone_chairperson`       | zone              |
| 7    | `club_president`         | club              |
| 8    | `club_secretary`         | club              |
| 9    | `club_treasurer`         | club              |
| 10   | `club_officer`           | club              |
| 11   | `member`                 | self              |
| 12   | `guest_viewer`           | self              |

Privilege is monotone: a higher-ranked role inherits every permission of
every lower-ranked role.

## Using the guard in a route handler

```ts
import { requirePermission, isGuardFailure } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const actor = await requirePermission('member.update', {
    club_id: 'CLUB_UUID',
    district_id: 'DISTRICT_UUID',
  });
  if (isGuardFailure(actor)) return actor;     // 401 or 403 already

  // ...mutate as `actor`
}
```

- `requirePermission(perm)` — permission-only check.
- `requirePermission(perm, target)` — adds a scope constraint: the
  actor's role must cover the target's `club_id` / `zone_id` / etc.
- Denials write a `rbac.denied` row to `audit_logs`.

## Permission matrix snapshot

See `src/lib/rbac/permissions.ts` for the source of truth. Highlights:

| Permission             | Minimum role             |
|------------------------|--------------------------|
| `member.read`          | `guest_viewer`           |
| `member.create`        | `club_secretary`         |
| `member.transfer`      | `club_president`         |
| `member.delete`        | `district_governor`      |
| `club.create`          | `district_governor`      |
| `club.delete`          | `multiple_district_admin`|
| `sync.trigger`         | `cabinet_officer`        |
| `sync.configure`       | `district_governor`      |
| `integration.manage`   | `multiple_district_admin`|
| `audit.read`           | `district_governor`      |
| `rbac.manage`          | `international_admin`    |

## Legacy role mapping

The original `member_role` enum (`admin`, `president`, …) is mapped at
read time to its federation equivalent via `legacyToLions`:

```
admin     → international_admin
president → club_president
secretary → club_secretary
treasurer → club_treasurer
officer   → club_officer
member    → member
```

New rows should set `members.lions_role` directly; the legacy column
remains for backwards compatibility.
