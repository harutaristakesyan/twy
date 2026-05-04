# Materialize per-user auth context in DynamoDB

## Context

Today every protected Lambda calls `loadAuthContext(userId)` (`packages/core/src/shared/permissions.ts:5`) which delegates to `getEffectivePermissionsForUser` in `packages/core/src/team/repository.ts:369`. That function runs multiple Aurora Data API round-trips per request to:

1. Read the `users` row (`teamId`, `branch`).
2. Read the `team` row (`branchRestricted`, `onlyOwnData`).
3. Read all `team_permissions` rows for that team.
4. Compose a `UserPermissionsContext { userId, teamId, branchId, branchRestricted, onlyOwnData, permissions }`.

Every authenticated handler — currently 24 call sites across `branch/`, `outside-broker/`, `broker-request/`, `carrier-request/`, `user/`, `load/`, `auth/me` — pays this cost on every invocation. Aurora Serverless v2 over the Data API is the slowest dependency in the request path (HTTPS RPC, 60–300 ms cold). It is also the single most-read piece of state in the system, so it is the highest-leverage place to add a cache.

We want to:
- **Materialize** each user's resolved auth context into a DynamoDB item so reads are sub-10 ms and Aurora-free.
- **Keep it consistent** by updating the materialized item from every write path that affects its inputs (user team change, user branch change, user activation, team flag change, team permissions change, team deletion).
- **Preserve the existing API surface** (`loadAuthContext(userId)` returns the same `UserPermissionsContext` shape) so handlers don't change.

## Design

### 1. New SST component: `infra/authContextTable.ts`

Add an `sst.aws.Dynamo` table named `AuthContext`:

- PK: `userId` (string).
- Attributes (denormalized snapshot): `teamId`, `branchId`, `branchRestricted`, `onlyOwnData`, `permissions` (map of `resource → { add, view, edit }`), `version` (number, monotonic), `updatedAt` (ISO).
- No GSI needed — all reads are by `userId`.
- On-demand billing.

Wire it into `sst.config.ts` exports and link it from the routes that call `loadAuthContext`, plus the auth-mutating routes (`team/*`, `user/*`, Cognito triggers). Update `infra/routes.ts` to add `"authContext"` to `linkKeys` for those handlers (the rest don't need it).

### 2. New core module: `packages/core/src/auth-context/`

```
auth-context/
  store.ts       Dynamo CRUD (get/put/delete). Uses Resource.AuthContext.
  rebuild.ts     rebuildAuthContext(userId) — re-reads Aurora, writes DDB item.
  index.ts
```

`store.ts` exports:
- `getCachedAuthContext(userId): Promise<UserPermissionsContext | null>` — `GetItem` from DDB.
- `putAuthContext(ctx: UserPermissionsContext): Promise<void>` — `PutItem`.
- `deleteAuthContext(userId): Promise<void>` — `DeleteItem`.

`rebuild.ts` exports:
- `rebuildAuthContext(userId)` — calls existing `getEffectivePermissionsForUser(userId)` (untouched), then `putAuthContext`.
- `rebuildAuthContextForTeam(teamId)` — looks up all users in the team via existing user repository, fans out a parallel rebuild for each. Used after team flag/permission changes.

### 3. Change `loadAuthContext` to read-through

`packages/core/src/shared/permissions.ts:5` becomes:

```ts
export const loadAuthContext = async (userId: string): Promise<UserPermissionsContext> => {
  const cached = await getCachedAuthContext(userId);
  if (cached) return cached;
  // Cache miss — rebuild from Aurora and persist.
  const ctx = await getEffectivePermissionsForUser(userId);
  await putAuthContext(ctx);
  return ctx;
};
```

This keeps all 24 existing call sites working without modification.

### 4. Hook write paths at the repository layer

Per the agreed design: **handlers do not change.** Rebuild logic lives in the existing core repositories that already own the DB mutations, so any future handler that calls these functions inherits consistency for free.

Edits to `packages/core/src/team/repository.ts` (the file that already exposes `getEffectivePermissionsForUser`, plus the team mutators):

| Repository function | What it must do post-mutation |
|---|---|
| `updateTeamRecord(teamId, { ..., branchRestricted, onlyOwnData, permissions })` | After the DB transaction commits, fetch member ids of `teamId` and call `rebuildAuthContextForTeam(teamId)` (parallel `Promise.all`). Affects every member. |
| `addMemberToTeam(teamId, memberId)` | `rebuildAuthContext(memberId)`. |
| `removeMemberFromTeam(teamId, memberId)` | `rebuildAuthContext(memberId)`. |
| `deleteTeamRecord(teamId)` | Capture member ids **before** the delete (FK cascade nulls `users.teamId`), commit the delete, then `rebuildAuthContext(memberId)` for each former member. |
| `createTeamRecord` | No-op (no members at creation). |

Edits to `packages/core/src/user/repository.ts`:

| Repository function | What it must do post-mutation |
|---|---|
| `createUser(...)` (used by both admin handler and `postConfirmation`) | `rebuildAuthContext(newUserId)`. New users with no team get an empty-permissions item. |
| `updateUser(userId, patch)` | If patch touches `teamId`, `branch`, or `isActive`, `rebuildAuthContext(userId)`. (Cheaper than rebuilding unconditionally; in practice the dashboard's user-edit only changes these fields, but the type guard keeps it tight.) |
| `deleteUserRecord(userId)` | `deleteAuthContext(userId)`. |

All rebuild calls are wrapped in `try/catch` — DDB failures log and swallow, since the Dynamo-miss read-through path will self-heal on the next request.

**Why repository-level, not handler-level:** the handlers in `packages/functions/src/api/{team,user}/*.ts` already delegate to these repository functions. Centralizing the cache-update there means there's exactly one place to audit per mutation type, and any future caller (a CLI script, a future webhook, another handler) automatically stays consistent. It also matches the package boundary documented in `packages/core/CLAUDE.md` — "Repositories own query composition" — and keeps `@twy/functions` thin.

### 5. Cognito post-confirmation (no auth context yet)

`postConfirmation.ts` already calls `createUser` from the user repository. With the repository-level hook in place, the empty-permissions DDB item is written automatically — `postConfirmation.ts` itself does not change.

### 6. JWT claims (deliberately unchanged)

We considered injecting `teamId`/permissions into the JWT via `preTokenGenerationV2`, which would skip the DDB read entirely. Rejected for this iteration: token TTL is 60 min, so permission revocations would not take effect until refresh. DDB is fast enough (single-digit ms) and gives us instant invalidation. Leave `preTokenGenerationV2.ts` alone.

### 7. Failure modes

- **DDB write fails after Aurora write succeeds**: log + swallow. Read-through will rebuild on next miss; subsequent mutations will overwrite.
- **DDB read fails**: read-through falls through to Aurora (existing behavior).
- **Stale item due to a missed write path**: bounded — every mutation handler is responsible. The `verification` step (below) lists each path.

## Files to change

**New:**
- `infra/authContextTable.ts`
- `packages/core/src/auth-context/{store,rebuild,index}.ts`

**Modified:**
- `sst.config.ts` (export the new component)
- `infra/routes.ts` (add `"authContext"` to `linkKeys` on every JWT-protected route, since `loadAuthContext` runs there; also on team/user mutation routes for the rebuild path)
- `packages/core/src/index.ts` (re-export `auth-context`)
- `packages/core/src/shared/permissions.ts` (read-through `loadAuthContext`)
- `packages/core/src/team/repository.ts` (rebuild hooks in `updateTeamRecord`, `addMemberToTeam`, `removeMemberFromTeam`, `deleteTeamRecord`)
- `packages/core/src/user/repository.ts` (rebuild hooks in `createUser`, `updateUser`, `deleteUserRecord`)

**Untouched:**
- All 24 read-side handlers calling `loadAuthContext`.
- All write-side handlers under `packages/functions/src/api/{team,user}/`.
- `packages/functions/src/events/postConfirmation.ts` (inherits from `createUser`).
- `getEffectivePermissionsForUser` (still the source of truth on cache miss / rebuild).
- `preTokenGenerationV2`.

## Verification

1. `pnpm sst deploy --stage <user>` — confirms the new DDB component provisions and IAM for both `dynamodb:GetItem`/`PutItem`/`DeleteItem` is auto-granted via `link[]`.
2. `pnpm sst shell --stage <user> -- pnpm --filter @twy/db migrate` — no schema change, but confirm it still runs.
3. **Write-path coverage** — manually exercise each of these and check the `AuthContext` table item:
   - Sign up new user (postConfirmation) → empty item written.
   - Admin assigns user to team → item populated with team's permissions/flags.
   - Admin updates team permission matrix → all members' items reflect the change.
   - Admin toggles `branchRestricted` on team → all members' items updated.
   - Move user between teams → item reflects new team's perms.
   - Delete user → DDB item removed.
   - Delete team → former members' items revert to no-team state.
4. **Read-through smoke test** — manually delete a user's DDB item via AWS console, hit `/api/me`, confirm it gets rebuilt and the response is correct.
5. `/verify` — biome + build + tests.
6. Add unit tests under `packages/core/src/auth-context/__tests__/`: `store.test.ts` (Dynamo client mocked), `rebuild.test.ts` (verifies `getEffectivePermissionsForUser` is called and result is written).
