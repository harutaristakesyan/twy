# Fix: Outside-broker request gating + permission cascade direction

## Context

Two related issues in the team-permission model surfaced today:

1. **Outside-broker request gating leaks via fallback.** The "Requests" tab and its actions (View / Approve / Reject) currently fall back to the general `brokers` permission when the dedicated `brokers_requests` row is empty. This means a user without any `brokers_requests.*` bit can still see and act on requests as long as they have `brokers.view`+`brokers.edit` (for view) or `brokers.edit` (for approve/reject). On top of that, the **View** button on each row is rendered unconditionally — its visibility relies entirely on the tab being hidden, which is a fragile defence.

2. **Cascade direction is inverted.** In the Team form's permission matrix, checking **Add** force-enables **Edit**. The product rule should be the other way around: **Edit** is the more powerful capability, so enabling Edit must imply Add, but enabling Add must NOT imply Edit. Edit should be optional once Add is on.

The fix tightens gating to the dedicated `brokers_requests` bits only (no fallback), gates the row-level View button explicitly, and rewires the cascade so `edit ⇒ add ⇒ view` (and unchecking `add` clears `edit`).

## Files to modify

### 1. Frontend permission helpers — drop the fallback

`apps/dashboard/src/utils/permissions.ts` (lines 53–63)

Replace:
```ts
export function canViewBrokerRequests(permissions: PermissionsMap): boolean {
  return (
    !!permissions.brokers_requests?.view ||
    (!!permissions.brokers?.view && !!permissions.brokers?.edit)
  );
}

export function canEditBrokerRequests(permissions: PermissionsMap): boolean {
  return !!permissions.brokers_requests?.edit || !!permissions.brokers?.edit;
}
```

With:
```ts
export function canViewBrokerRequests(permissions: PermissionsMap): boolean {
  return !!permissions.brokers_requests?.view;
}

export function canEditBrokerRequests(permissions: PermissionsMap): boolean {
  return !!permissions.brokers_requests?.edit;
}
```

(Helpers kept rather than inlined so callers — `OutsideBrokersLayout.tsx:16`, `BrokerRequestsTab.tsx:23`, and the route guard `RequireBrokerRequestsView.tsx` — keep their single source of truth.)

### 2. Backend permission asserters — drop the fallback

`packages/core/src/shared/permissions.ts` (lines 18–34)

Replace:
```ts
export const assertBrokerRequestsView = (ctx: UserPermissionsContext): void => {
  const p = ctx.permissions;
  if (p.brokers_requests?.view || (p.brokers?.view && p.brokers?.edit)) {
    return;
  }
  throw new createError.Forbidden("Forbidden");
};

export const assertBrokerRequestsEdit = (ctx: UserPermissionsContext): void => {
  const p = ctx.permissions;
  if (p.brokers_requests?.edit || p.brokers?.edit) {
    return;
  }
  throw new createError.Forbidden("Forbidden");
};
```

With direct delegations to the existing `assertPermission` helper:
```ts
export const assertBrokerRequestsView = (ctx: UserPermissionsContext): void =>
  assertPermission(ctx, "brokers_requests", "view");

export const assertBrokerRequestsEdit = (ctx: UserPermissionsContext): void =>
  assertPermission(ctx, "brokers_requests", "edit");
```

Affects every handler that already imports these helpers — `packages/functions/src/api/broker-request/{list,approve,reject,create}.ts`. No call-site changes required.

### 3. Gate the row-level View button explicitly

`apps/dashboard/src/features/outside-broker/pages/BrokerRequestsTab.tsx`

Currently the per-row **View** button (around line 163) renders unconditionally inside the actions column. Wrap it so it only renders when `canView` is true. Compute once at the top of the component, alongside the existing `canReview`:

```ts
const canView = canViewBrokerRequests(permissions);
const canReview = canEditBrokerRequests(permissions);
```

In the row render:
```tsx
{canView && (
  <Button icon={<EyeOutlined />} onClick={() => openView(record)}>View</Button>
)}
```

In practice the tab is already hidden when `canView` is false (via `OutsideBrokersLayout.tsx`), but defence-in-depth is cheap and protects against direct URL navigation to `/outside-brokers/requests`. The route guard `RequireBrokerRequestsView` (`apps/dashboard/src/routes/RequireBrokerRequestsView.tsx`) will also start rejecting fallback-only users once helper #1 changes — verify it still uses `canViewBrokerRequests`.

### 4. Flip the cascade direction in the matrix UI

`apps/dashboard/src/features/team/components/PermissionMatrixField.tsx` (lines 40–66)

Replace the `cascade` function and update the comment above it:

```ts
// edit → requires add + view; add → requires view.
// Cascade: checking a permission enables its prerequisites; unchecking disables dependents.
function cascade(
  action: Action,
  checked: boolean,
  row: Record<Action, boolean>,
): Record<Action, boolean> {
  const r = { ...row, [action]: checked };
  if (checked) {
    if (action === "edit") {
      r.add = true;
      r.view = true;
    }
    if (action === "add") {
      r.view = true;
    }
  } else {
    if (action === "view") {
      r.edit = false;
      r.add = false;
    }
    if (action === "add") {
      r.edit = false;
    }
  }
  return r;
}
```

New invariant: `edit ⇒ add ⇒ view`. Edit is optional when only Add is on. The column-level "select all" toggle (`handleColumnToggle`) already passes through `cascade`, so it inherits the new behaviour automatically.

## Out of scope (intentionally)

- **No DB migration** to retroactively flip `(edit=true, add=false)` rows. Such rows are tolerated by the runtime asserters (`assertPermission` checks the bits independently), and any subsequent team edit will normalise them via the new cascade. If the user asks for a one-shot cleanup later, it can be a separate Drizzle migration.
- **Carrier requests** (`carriers_requests`) already gates correctly via `RequirePermission resource="carriers_requests"` and `assertPermission(ctx, "carriers_requests", …)` with no fallback — no change needed.
- **No new resource or action** — the matrix shape (9 resources × 3 actions) is unchanged.

## Verification

1. **Type + lint + test gate** — `pnpm check:ci && pnpm build && pnpm test` (or `/verify`).
2. **Cascade behaviour** — open the Team form, pick a resource:
   - Toggle **Edit** on → **Add** and **View** auto-check. ✅
   - With all three on, toggle **Edit** off → only Edit clears, Add and View stay on. ✅
   - Toggle **Add** on (from all-off) → **View** auto-checks but **Edit** stays off. ✅
   - With Add+View on, toggle **Add** off → **Edit** stays off, View stays on. ✅
   - Toggle **View** off (from all-on) → **Add** and **Edit** also clear. ✅
3. **Broker-request gating** — create two test teams:
   - Team A: `brokers.view=true, brokers.edit=true`, all `brokers_requests.*=false`.
   - Team B: `brokers_requests.view=true, brokers_requests.edit=false`.
   - Sign in as Team A user → "Requests" tab is **hidden**, navigating to `/outside-brokers/requests` redirects (route guard rejects). API call to `GET /broker-requests` returns 403.
   - Sign in as Team B user → "Requests" tab visible, **View** button visible, **Approve/Reject** hidden. API call to `POST /broker-requests/:id/approve` returns 403.
4. **Backend smoke** — with cluster up, hit `/api/broker-requests` with a JWT for each team and confirm 200 vs 403 matches the matrix above.

## Critical files (summary)

| Concern | Path |
|---|---|
| Frontend helpers | `apps/dashboard/src/utils/permissions.ts` |
| Backend asserters | `packages/core/src/shared/permissions.ts` |
| Requests UI (View gate) | `apps/dashboard/src/features/outside-broker/pages/BrokerRequestsTab.tsx` |
| Cascade rule | `apps/dashboard/src/features/team/components/PermissionMatrixField.tsx` |
| Tab/route guard call sites (no edit, just verify) | `apps/dashboard/src/features/outside-broker/pages/OutsideBrokersLayout.tsx`, `apps/dashboard/src/routes/RequireBrokerRequestsView.tsx`, `packages/functions/src/api/broker-request/{list,approve,reject,create}.ts` |
