# TWY-15 — Generic, per-action, per-status-transition team permissions

## Context

Today's permission model is too coarse and Load-specific:

- `team_permissions(team_id, resource, action, allowed)` only encodes flat resource × action with three actions (`add | view | edit`) — see `packages/db/src/schema/team.ts:13-24` and the frontend canonical list at `apps/dashboard/src/utils/permissions.ts:1-29`.
- Status changes are gated solely by `loads:edit` (`packages/functions/src/api/load/changeStatus.ts:21-23`); any user with `loads:edit` can perform every transition the state machine allows.
- The JWT carries only `app_user_id` (`packages/functions/src/events/preTokenGenerationV2.ts:3-23`); permissions are re-loaded per request via `loadAuthContext` (`packages/core/src/shared/permissions.ts:6,20`).
- TWY-13 added a load status state machine (`packages/core/src/load/status-machine.ts`) — the UI's status dropdown must now intersect `getAllowedTransitions(load.status)` with the team's permitted transitions before rendering, and the backend must reject denied transitions.

TWY-15 replaces this with a generic registry-driven model that scales to Payment Order, Customer, Carrier, Broker, etc. without schema migrations per entity, and adds per-status-transition granularity plus an admin matrix UI.

## Design decisions (locked with user)

1. **Scope of v1**: Full spec including admin UI + Cognito-free DB lookup + `own_team` scope evaluated against existing team flags (`branchRestricted`, `onlyOwnData`).
2. **Encoding**: Reuse the existing `team_permissions` table. Action becomes a string with optional suffix: `add | view | edit | delete | transition:<Status>`. **No schema migration to the perms table itself.**
3. **Delivery**: Keep DB lookup via `loadAuthContext` per request. No JWT bloat. (Caching can be layered in later without API changes.)
4. **Roles**: Flat permission list on team. No role abstraction in v1.

## Implementation plan

### 1. Permission registry (`packages/core/src/permissions/registry.ts`) — new

Single source of truth for the cartesian product of `(entity, action[, status])`. Used by:
- the metadata endpoint that drives the admin UI matrix,
- the `requirePermission` middleware to validate action strings,
- the seed migration to backfill existing teams.

```ts
// shape only — full enum lists in implementation
export const PERMISSION_REGISTRY = {
  loads: {
    actions: ["add", "view", "edit", "delete"],
    transitions: loadStatusValues, // imported from @twy/db
  },
  payment_orders: {
    actions: ["add", "view", "edit", "delete"],
    transitions: paymentOrderStatusValues,
  },
  brokers: { actions: ["add", "view", "edit", "delete"] },
  carriers_twy: { actions: ["add", "view", "edit", "delete"] },
  carriers_outside: { actions: ["add", "view", "edit", "delete"] },
  customers: { actions: ["add", "view", "edit", "delete"] }, // when introduced
  teams: { actions: ["add", "view", "edit", "delete"] },
  users: { actions: ["add", "view", "edit", "delete"] },
  branches: { actions: ["add", "view", "edit", "delete"] },
} as const;

export type Entity = keyof typeof PERMISSION_REGISTRY;
export type BaseAction = "add" | "view" | "edit" | "delete";
export type TransitionAction = `transition:${string}`;
export type Action = BaseAction | TransitionAction;

export const isKnownPermission = (entity: string, action: string) => …;
export const expandRegistry = () => …;  // flat list for the metadata endpoint
```

Re-exported from `packages/core/src/index.ts`.

### 2. Auth context — extend `assertPermission`

`packages/core/src/shared/permissions.ts`

- Keep `loadAuthContext` shape (still returns `{ userId, teamId, permissions, branchRestricted, onlyOwnData }`).
- Add `hasPermission(ctx, entity, action)` returning `boolean` (cheap predicate for callers that filter lists).
- Extend `assertPermission(ctx, entity, action)` to throw a structured `PermissionDeniedError` carrying `{ entity, action }` (replaces the current `403`).
- Add `assertTransition(ctx, entity, toStatus)` shorthand → checks `transition:<toStatus>` exclusively (the new fine-grained gate). It does **not** also check `edit` — `edit` and `transition:*` are independent perms in the registry, granted independently in the admin UI.
- Add `getPermittedTransitions(ctx, entity, allowedByStateMachine)` — returns the intersection used by the UI dropdown logic from TWY-13.

### 3. `permission_denied` error contract

`packages/functions/src/shared/errors/PermissionDeniedError.ts` (or extend the existing error layer). Returns:

```json
{ "error": "permission_denied", "missing": { "entity": "loads", "action": "transition:Approved" } }
```

HTTP 403. `jsonErrorHandler` already converts thrown `http-errors` — wire this class through the same path so the UI can read `body.missing.action` and disable buttons consistently.

### 4. `requirePermission` middleware

`packages/functions/src/shared/middy/requirePermission.ts` — Middy middleware factory:

```ts
export const requirePermission = (entity: Entity, action: Action) => ({
  before: async (request) => {
    const userId = request.event.requestContext.authUser.userId;
    const ctx = await loadAuthContext(userId);
    if (!hasPermission(ctx, entity, action)) {
      throw new PermissionDeniedError(entity, action);
    }
    request.context.authCtx = ctx; // surface for downstream handler
  },
});
```

Composed into `middyfy` after `httpJwtExtractor` (see `packages/functions/src/shared/lambda.ts:43-48`). Handler signature gains `event.context.authCtx` so handlers don't re-load it.

For status-transition routes (`POST /api/loads/{id}/status`), enforcement happens inside the handler — the target status comes from the request body, so the check is dynamic:

```ts
// changeStatus.ts
const ctx = event.context.authCtx;
assertTransition(ctx, "loads", body.newStatus); // throws PermissionDeniedError
```

### 5. Status-machine integration

`packages/core/src/load/status-machine.ts` is unchanged structurally. Add a sibling helper:

```ts
export const getAllowedAndPermittedTransitions = (
  ctx: AuthContext,
  entity: Entity,
  from: LoadStatus,
): LoadStatus[] =>
  getAllowedTransitions(from).filter((to) =>
    hasPermission(ctx, entity, `transition:${to}`),
  );
```

Used by the load list/detail GET endpoints to return per-row permitted transitions for the dropdown (avoids a permissions roundtrip on the client). Same approach for Payment Order.

### 6. `own_team` scope

Existing team flags `branchRestricted` and `onlyOwnData` already encode the scope; the redesign treats them as the implementation of `own_team`. No new column. Wire into existing repository queries (`packages/core/src/load/repository.ts`, `packages/core/src/payment-order/repository.ts`, etc.) by adding a `scopeForCtx(ctx)` helper in `packages/core/src/shared/permissions.ts` that returns Drizzle predicates:

```ts
export const scopeForCtx = (ctx: AuthContext, entity: Entity) => {
  if (!ctx.onlyOwnData) return undefined;
  // returns sql predicates the repository can AND into its where()
};
```

Repositories accept an optional `scope` argument; handlers pass `scopeForCtx(authCtx, "loads")`. (Per-record scope is explicitly **out of scope** — flagged for v2.)

### 7. Metadata endpoint

`GET /api/permissions/registry` → returns expanded registry for the admin UI:

```json
{
  "entities": [
    { "name": "loads", "actions": ["add","view","edit","delete"], "transitions": ["Pending","Approved","Hold","Declined","Delivered"] },
    { "name": "payment_orders", "actions": [...], "transitions": [...] },
    ...
  ]
}
```

New handler: `packages/functions/src/api/permissions/registry.ts`. No auth-gated content — `view` for `teams` is sufficient (admins editing the matrix already need that).

### 8. Audit log (new table)

`packages/db/src/schema/permissionAudit.ts`:

```ts
export const permissionAudit = pgTable("permission_audit", {
  id: uuid().primaryKey().defaultRandom(),
  teamId: uuid().notNull().references(() => team.id, { onDelete: "cascade" }),
  resource: text().notNull(),
  action: text().notNull(),
  previousAllowed: boolean(),
  newAllowed: boolean().notNull(),
  changedByUserId: uuid().notNull().references(() => users.id),
  changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
```

New migration: `packages/db/drizzle/0012_permission_audit.sql` (generated). `updateTeamPermission` operation writes a row per change.

### 9. Backfill migration

`packages/db/drizzle/0013_seed_transition_permissions.sql` (data migration, not schema):

For every existing `team_permissions` row where `resource='loads' AND action='edit' AND allowed=true`, insert one row per load status: `(team_id, 'loads', 'transition:<Status>', true)`. Idempotent (`ON CONFLICT DO NOTHING`). Same for `payment_orders:edit` → `transition:*`. **Result:** zero behavioral regression — anyone who could edit before can perform every transition after.

Equally seed `delete` permission for teams that currently have `edit` (today's `edit` includes delete implicitly in some handlers — verify per-handler before locking this in).

### 10. Admin UI matrix

`apps/dashboard/src/features/team/components/PermissionMatrix.tsx` — new component:

- Fetches `/api/permissions/registry` once on mount.
- Rows: entities (collapsible).
- Columns: `add | view | edit | delete` + a separate "Transitions" expansion column rendering one checkbox per status.
- Checkbox state hydrates from `GET /api/teams/{id}` (which already returns the team's permission list — verify the response shape and extend if needed).
- Save → batched `PATCH /api/teams/{id}/permissions` with the full new permission list (or a diff array). Server writes audit rows.
- Replace the existing matrix in `apps/dashboard/src/features/team/` (find the current edit form and swap in the new component).

### 11. Frontend hook + usage cleanup

`apps/dashboard/src/hooks/usePermission.ts` — new hook:

```ts
export const usePermission = (
  entity: Entity,
  action: BaseAction | "transition",
  status?: string,
): boolean => {
  const { authMe } = useAuth();
  const key = action === "transition" ? `transition:${status}` : action;
  return Boolean(authMe?.permissions?.[entity]?.[key]);
};
```

- Replace inline permission checks across `apps/dashboard/src/features/**` with this hook.
- `RequirePermission` route gate (`apps/dashboard/src/routes/router.tsx`) keeps its current API — internally calls `usePermission`.
- Update `apps/dashboard/src/utils/permissions.ts`:
  - Extend `ACTIONS` to `["add", "view", "edit", "delete"]`.
  - Add transition handling to `normalizePermissionsMap` (keys like `transition:Approved` flow through unchanged — they're just strings under each entity).
- StatusUpdateModal (`apps/dashboard/src/features/load/components/StatusUpdateModal.tsx`, referenced in TWY-13) now filters its dropdown via `getPermittedTransitions(load.status, usePermission)`.

### 12. Handler migration

Sweep every handler under `packages/functions/src/api/**` and replace inline `assertPermission(ctx, ...)` calls with the `requirePermission(...)` middleware in the `middyfy` chain. The status-change handler keeps its in-body `assertTransition` (target status is dynamic).

A grep target list:
- `packages/functions/src/api/load/*.ts`
- `packages/functions/src/api/payment-order/*.ts`
- `packages/functions/src/api/{branch,broker,carrier-twy,outside-carrier,outside-broker,user,team,file}/*.ts`

For each, the action mapping is:
- `POST` (create) → `add`
- `GET` (list/get) → `view`
- `PATCH`/`PUT` → `edit`
- `DELETE` → `delete`
- `POST /…/status` → `transition:<body.newStatus>` (in-handler `assertTransition`)

### 13. Tests

New tests (Vitest, following twy AAA + Zod-fixture conventions):

- `packages/core/src/permissions/registry.test.ts` — registry shape + `isKnownPermission`.
- `packages/core/src/shared/permissions.test.ts` — `hasPermission`, `assertPermission`, `assertTransition`, `getPermittedTransitions` (positive + negative; transition denial).
- `packages/functions/src/shared/middy/requirePermission.test.ts` — middleware throws `PermissionDeniedError` shape.
- `packages/functions/src/api/load/changeStatus.test.ts` — extend to cover: (a) team without `transition:Approved` is denied; (b) state-machine-invalid transition still throws `InvalidTransitionError`; (c) both: state-machine-allowed + permission-allowed → success.
- `packages/functions/src/api/payment-order/<status-change>.test.ts` — equivalent.
- `apps/dashboard/src/hooks/usePermission.test.ts` — hook returns correct booleans for base + transition actions.

## Critical files

**New:**
- `packages/core/src/permissions/registry.ts`
- `packages/functions/src/shared/middy/requirePermission.ts`
- `packages/functions/src/shared/errors/PermissionDeniedError.ts`
- `packages/functions/src/api/permissions/registry.ts` + route in `infra/routes.ts`
- `packages/db/src/schema/permissionAudit.ts`
- `packages/db/drizzle/0012_permission_audit.sql` (generated)
- `packages/db/drizzle/0013_seed_transition_permissions.sql`
- `apps/dashboard/src/features/team/components/PermissionMatrix.tsx`
- `apps/dashboard/src/hooks/usePermission.ts`

**Modified:**
- `packages/core/src/shared/permissions.ts` — add `hasPermission`, `assertTransition`, `getPermittedTransitions`, `scopeForCtx`.
- `packages/core/src/load/status-machine.ts` — add `getAllowedAndPermittedTransitions`.
- `packages/core/src/index.ts` — export new modules.
- `packages/functions/src/shared/lambda.ts` — keep middyfy intact; ensure middleware composes cleanly with new `requirePermission`.
- `packages/functions/src/api/**/*.ts` — sweep to use middleware (see §12).
- `apps/dashboard/src/utils/permissions.ts` — extend ACTIONS, support transition keys.
- `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx` — intersect with permitted transitions.
- `apps/dashboard/src/features/load/utils/statusMachine.ts` — keep, but call hook-filtered list in UI.
- `apps/dashboard/src/routes/router.tsx` — no API change; verify `RequirePermission` covers `delete` action where missing.
- `apps/dashboard/src/providers/AuthProvider.tsx` — verify `/auth/me` carries new permission keys (no shape change expected since map is already `{entity: {action: bool}}`).

## Reused functions / utilities (do not re-create)

- `loadAuthContext` (`packages/core/src/shared/permissions.ts:6`)
- `getAllowedTransitions`, `assertValidTransition` (`packages/core/src/load/status-machine.ts:33,36`)
- `jsonErrorHandler` (`packages/functions/src/shared/`) — already converts `http-errors`; `PermissionDeniedError` extends `createHttpError(403)`.
- `middyfy` / `httpJwtExtractor` (`packages/functions/src/shared/lambda.ts`)
- `normalizePermissionsMap` (`apps/dashboard/src/utils/permissions.ts:31`) — extend rather than replace.
- `RequirePermission` route gate (`apps/dashboard/src/routes/`).
- Team flags `branchRestricted`, `onlyOwnData` (`packages/db/src/schema/team.ts:7-8`) — wire into `scopeForCtx`, no new column.

## Verification

1. **Static**: `pnpm check:ci && pnpm build` (zero warnings; Biome clean).
2. **Unit / integration**: `pnpm test` — all new test files green; existing test suite unchanged in count except for additions.
3. **Migrations**: `pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate` — `0012` creates `permission_audit`; `0013` seeds transition perms idempotently (re-run is a no-op).
4. **API smoke**: Against `dev`, with a team granted only `loads:transition:Approved`:
   - `POST /api/loads/{id}/status {newStatus: "Approved"}` → 200.
   - `POST /api/loads/{id}/status {newStatus: "Declined"}` → 403, body `{error:"permission_denied", missing:{entity:"loads", action:"transition:Declined"}}`.
   - `GET /api/loads/{id}` → response's permitted-transitions array contains only `["Approved"]`.
5. **Admin UI**: load the team edit page → matrix renders entities × actions, transition column expands under `loads` and `payment_orders`. Toggling a checkbox saves and reloads cleanly; `permission_audit` gets a row per toggle.
6. **Frontend hook**: revoke `loads:transition:Approved` for the logged-in user's team → load detail page's status dropdown no longer shows "Approved" even though state machine allows it.
7. **Regression**: existing teams (post-backfill) can perform every transition they could before — exercise one user pre-migration vs post-migration on a Pending → Approved → Delivered chain.

## Out of scope (called out explicitly)

- Per-record scope (`own_record`) — deferred to v2.
- Role abstraction layer (Manager/Member/Viewer) — deferred; v1 stays flat.
- Time-bound permissions — TWY-15 explicitly v3.
- Cognito custom claims for perms — not adopted; chose DB lookup. Revisit if Lambda cold path shows DB hit as a hotspot.
- Charges sync inside payment order — TWY-16 territory, unchanged here.
