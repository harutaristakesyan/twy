# Plan: Wire `branchRestricted` (and `onlyOwnData` for loads) into list queries

## Context

The `team.branchRestricted` boolean and `team.onlyOwnData` boolean already exist on the `team` table, are loaded into `UserPermissionsContext` by `getEffectivePermissionsForUser` (`packages/core/src/team/repository.ts:369-412`), and are returned to the dashboard via `/api/auth/me`. A helper `buildScope(ctx)` exists at `packages/core/src/shared/permissions.ts:36-41` that translates those flags into a `{ branchId, ownerId }` filter — but it is **not called anywhere**. As a result, the team-scoping settings have no runtime effect today.

This plan wires `buildScope` into the three list endpoints (users, branches, loads) so the flags actually filter results, with the following decisions confirmed by the user:

- A user on a `branchRestricted` team **without** an assigned `branchId` sees **empty results** (restrictive — fail-closed).
- `onlyOwnData` is wired only on **loads** (filters `load.createdBy = userId`). Users and branches lists don't have a matching "ownership" concept and ignore `onlyOwnData`.
- Scope is enforced on **list endpoints only** in this pass. Single-entity GET-by-id and update/delete authorization are out of scope.

## Approach

Two small primitive changes, then thread the scope through three list handlers and three repo functions.

### 1. Extend `buildScope` to surface a fail-closed signal

`packages/core/src/shared/permissions.ts:36-41` — change the return shape so the caller can distinguish "no filter" from "deny all":

```ts
export const buildScope = (ctx: UserPermissionsContext) => ({
  branchId: ctx.branchRestricted ? ctx.branchId ?? undefined : undefined,
  ownerId: ctx.onlyOwnData ? ctx.userId : undefined,
  denyAll: ctx.branchRestricted && !ctx.branchId,
});
```

`denyAll = true` only when the team is branch-restricted *and* the user has no `branchId`. Handlers short-circuit and return an empty page; nothing reaches the repo.

`PermissionsScope` type (already exported as `ReturnType<typeof buildScope>`) updates automatically.

### 2. Add optional `branchId` to the three `ListXxxInput` types and `ownerId` to `ListLoadsInput`

For each repo, add the optional fields and `and()` them into the existing `whereClause` (combines cleanly with `searchClause` because `and()` ignores `undefined`).

#### `packages/core/src/user/repository.ts` (listUsers, L79-91 and L110-151)

- Add `branchId?: string` to `ListUsersInput`.
- Build `branchClause = branchId ? eq(users.branch, branchId) : undefined` (the FK column is `users.branch` per L131, L138).
- Replace `.where(searchClause)` with `.where(and(searchClause, branchClause))` in **both** the data SELECT (L140) and the count SELECT (L144).

#### `packages/core/src/branch/repository.ts` (listBranches, L33-39 and L86-122)

- Add `branchId?: string` to `ListBranchesInput`.
- Build `branchClause = branchId ? eq(branch.id, branchId) : undefined`.
- Wrap both data and count `.where()` clauses with `and(searchClause, branchClause)`.

#### `packages/core/src/load/repository.ts` (listLoads, L108-114 and L253-288)

- Add `branchId?: string` and `ownerId?: string` to `ListLoadsInput`.
- Build:
  - `branchClause = branchId ? eq(load.branchId, branchId) : undefined` (column at `packages/db/src/schema/load.ts:54`).
  - `ownerClause = ownerId ? eq(load.createdBy, ownerId) : undefined` (column at `packages/db/src/schema/load.ts:60`).
- Wrap both data and count `.where()` with `and(searchClause, branchClause, ownerClause)`.

### 3. Thread scope through three list handlers

Identical 4-line edit in each handler. Example for `packages/functions/src/api/user/list.ts:12-31` (replicate verbatim in `branch/list.ts` and `load/list.ts`, swapping the resource string and repo function — `load/list.ts` also forwards `ownerId`):

```ts
const ctx = await loadAuthContext(userId);
assertPermission(ctx, "users", "view");
const scope = buildScope(ctx);
if (scope.denyAll) {
  return { users: [], total: 0 };  // shape matches existing list response
}
const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;
const result = await listUserRecords({
  page, limit, sortField, sortOrder, query,
  branchId: scope.branchId,
});
```

For `load/list.ts` the call additionally passes `ownerId: scope.ownerId`.

Confirm `buildScope` is re-exported from `packages/core/src/index.ts`. If the barrel does not yet expose `shared/permissions`, add `export * from "./shared/permissions.js";` (or extend the existing shared barrel).

### Critical files to modify

- `packages/core/src/shared/permissions.ts` — extend `buildScope` return shape with `denyAll`.
- `packages/core/src/user/repository.ts` — `ListUsersInput` + `listUsers` where-clause.
- `packages/core/src/branch/repository.ts` — `ListBranchesInput` + `listBranches` where-clause.
- `packages/core/src/load/repository.ts` — `ListLoadsInput` + `listLoads` where-clause (branch + owner).
- `packages/functions/src/api/user/list.ts` — call `buildScope`, short-circuit on `denyAll`, forward `branchId`.
- `packages/functions/src/api/branch/list.ts` — same shape as user list.
- `packages/functions/src/api/load/list.ts` — same shape, additionally forwards `ownerId`.
- `packages/core/src/index.ts` — verify `buildScope` is re-exported (add if missing).

### Reused primitives (do not reimplement)

- `loadAuthContext(userId)` — already in every list handler.
- `assertPermission(ctx, resource, action)` — already in every list handler.
- `buildScope(ctx)` — extended in step 1; the only new wiring is calling it.
- `and`, `eq`, `ilike`, `or` from `drizzle-orm` — already imported in each repo.

## Verification

### Unit (Vitest, per repo)

Add tests under `packages/core/src/{user,branch,load}/__tests__/` (or co-located `*.test.ts`):

- Seed two branches (`B1`, `B2`) with users/loads/own-branch rows in each.
- `listUsers({ branchId: B1.id })` → only B1 users; `total` reflects filtered count.
- `listBranches({ branchId: B1.id })` → exactly one row.
- `listLoads({ branchId: B1.id })` → only B1 loads.
- `listLoads({ ownerId: U1.id })` → only loads with `createdBy = U1.id`.
- `listLoads({ branchId: B1.id, ownerId: U1.id })` → AND semantics.
- Combined with search: `listUsers({ branchId: B1.id, query: "ACME" })` → AND of search + branch.
- Omit filters → returns all (back-compat).

### Handler tests

In `packages/functions/src/api/{user,branch,load}/__tests__/list.test.ts`:

- Stub `loadAuthContext` to return `{ branchRestricted: true, branchId: B1.id, onlyOwnData: false, ... }` → repo called with `branchId: B1.id`.
- Stub `{ branchRestricted: true, branchId: null }` → handler returns empty list, repo NOT called.
- Stub `{ branchRestricted: false }` → repo called with `branchId: undefined`.
- For load: stub `{ onlyOwnData: true, userId: U1.id }` → repo called with `ownerId: U1.id`.

### Manual end-to-end

1. `pnpm sst dev --stage <yourname>` and `pnpm run:dashboard`.
2. Create teams `Restricted` (branchRestricted=true) and `Open` (both flags false) via the User Management UI.
3. Assign user `alice` to `Restricted` + branch `B1`; user `bob` to `Open` (any branch).
4. Sign in as `alice` → `/users`, `/branches`, `/loads` should all show only B1 rows.
5. Sign in as `bob` → all three lists show everything.
6. Edge: temporarily clear `alice.branch` (set to null in DB), re-login → all three lists return empty (denyAll path).
7. Toggle `Restricted.onlyOwnData = true` → as `alice` on `/loads`, see only loads where `createdBy = alice.id`. Confirm `/users` and `/branches` are unaffected by `onlyOwnData`.

### Verification gate

`/verify` (lint + typecheck + build + test) followed by code-reviewer subagent on the diff before `/ship`.

## Out of scope (explicit non-goals)

- Single-entity GETs (`getFullUserInfoById`, future `getLoadById`/`getBranchById`) — direct id lookups remain ungated.
- Update/delete authorization for cross-branch rows.
- `onlyOwnData` filtering on users or branches lists (intentionally loads-only per requirement).
- Admin write-path validation forbidding a `branchRestricted` user from being saved without a `branch`. Current behavior of locking such a user out of all lists is the user-facing signal; admin tightening is a separate ticket.
- Frontend changes — pagination handles narrower result sets transparently; no UI work required.
