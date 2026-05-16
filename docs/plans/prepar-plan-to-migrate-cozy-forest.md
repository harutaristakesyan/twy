# Migrate `apps/dashboard` from `react-router-dom` v7 to TanStack Router

## Context

`apps/dashboard` currently uses `react-router-dom@7.9.4` with `createBrowserRouter` in `src/routes/router.tsx`. The setup is purely client-side (no loaders/actions/data APIs, no lazy routes) and auth/permission gating is implemented via three render-time JSX wrappers (`ProtectedRoute`, `RequirePermission`, `RequireBrokerRequestsView`) that emit `<Navigate>` after the component mounts.

We are migrating fully to **TanStack Router** to:

- Gain type-safe route params, search params, and link `to=`.
- Gate routes *before* the page renders via `beforeLoad → throw redirect()`, eliminating mount-then-redirect flicker on permission-denied paths.
- Unblock future SSR / data-router features (route-level loaders, search-param state, devtools).

Per user decisions: **file-based routes**, **`beforeLoad` guards**, **single local migration pass** (no PR / staged rollout).

## Critical files

Current routing surface (31 source files + 1 test import from `react-router-dom`). The full inventory was produced during planning. Key files to delete/rewrite:

- `apps/dashboard/src/routes/router.tsx` — replaced by generated `routeTree.gen.ts` + `src/router.ts`
- `apps/dashboard/src/routes/ProtectedRoute.tsx` — folded into `_authed` layout route `beforeLoad`
- `apps/dashboard/src/routes/RequirePermission.tsx` — replaced by a `requirePermission(ctx, resource, action)` helper called from `beforeLoad`
- `apps/dashboard/src/routes/RequireBrokerRequestsView.tsx` — folded into the brokers/requests route `beforeLoad`
- `apps/dashboard/src/app/App.tsx` — `RouterProvider` swap
- `apps/dashboard/vite.config.ts` — add `@tanstack/router-plugin/vite`
- `apps/dashboard/package.json` — swap deps
- `apps/dashboard/src/features/user/pages/UserManagementPage.test.tsx` — swap `MemoryRouter` for `createMemoryHistory` + test `RouterProvider`

## Approach

### 1. Dependencies (`apps/dashboard/package.json`)

Add:
- `@tanstack/react-router`
- `@tanstack/router-devtools` (dev)
- `@tanstack/router-plugin` (dev) — Vite codegen for file-based routes

Remove:
- `react-router-dom`

Run `pnpm install` at repo root (single hoisted lockfile).

### 2. Vite plugin (`apps/dashboard/vite.config.ts`)

Add the TanStack router plugin **before** `@vitejs/plugin-react` so route tree codegen runs first:

```ts
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
// ...
plugins: [TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }), react()],
```

Gitignore `apps/dashboard/src/routeTree.gen.ts`.

### 3. File-based route layout (`apps/dashboard/src/routes/`)

Wipe the existing `routes/` directory contents (move guards out first — see step 4). Reproduce the current tree as files:

```
src/routes/
  __root.tsx                          # createRootRouteWithContext<{ auth, queryClient }>()
  _public.tsx                         # layout: no guard, renders <Outlet/>
  _public.login.tsx
  _public.forgot-password.tsx
  _public.verification.tsx
  _public.create-password.tsx
  _public.set-password.tsx
  _public.register.tsx
  _authed.tsx                         # beforeLoad: require JWT, render <AppLayout/>
  _authed.index.tsx                   # beforeLoad: redirect → /loads
  _authed.profile.tsx
  _authed.settings.tsx                # beforeLoad: requirePermission("settings","view")
  _authed.loads.tsx
  _authed.loads.create.tsx
  _authed.branches.tsx
  _authed.user-management.tsx         # layout
  _authed.user-management.index.tsx   # beforeLoad: redirect → users
  _authed.user-management.users.tsx
  _authed.user-management.teams.tsx
  _authed.outside-brokers.tsx         # layout (NavLink tabs)
  _authed.outside-brokers.index.tsx
  _authed.outside-brokers.directory.tsx
  _authed.outside-brokers.requests.tsx
  _authed.carriers.tsx                # layout (NavLink tabs)
  _authed.carriers.index.tsx
  _authed.carriers.twy.tsx
  _authed.carriers.outside.tsx
  _authed.carriers.requests.tsx
  _authed.accounting.tsx              # layout
  _authed.accounting.index.tsx
  _authed.accounting.payment-orders.tsx
  _authed.accounting.external-billing.tsx
  _authed.accounting.internal-billing.tsx
  $.tsx                               # splat / 404
```

`_public` and `_authed` are **pathless layout routes** (TanStack convention: leading `_`). Each leaf file `export const Route = createFileRoute("/...")({ component, beforeLoad? })`.

### 4. Guard helpers (`apps/dashboard/src/routes/_guards.ts`)

Extract the existing guard logic into pure functions usable from `beforeLoad`. `beforeLoad` runs before render and can `throw redirect({ to: "/login", search: { from: location.pathname } })`.

```ts
// _guards.ts (sketch)
import { redirect } from "@tanstack/react-router";
import { getIdToken } from "@/utils/jwt";
import { canViewBrokerRequests } from "@/utils/permissions";
import type { Action, Resource } from "@/types/permissions";

export const requireAuth = ({ location }: { location: { pathname: string } }) => {
  if (!getIdToken()) throw redirect({ to: "/login", search: { from: location.pathname } });
};

export const requirePermission =
  (resources: Resource | Resource[], action: Action) =>
  ({ context }: { context: { permissions: ... } }) => {
    const list = Array.isArray(resources) ? resources : [resources];
    if (!list.some((r) => context.permissions?.[r]?.[action])) {
      throw redirect({ to: "/profile" });
    }
  };

export const requireBrokerRequestsView = ({ context }) => {
  if (!canViewBrokerRequests(context.permissions)) throw redirect({ to: "/" });
};
```

The router context must expose `permissions` — wire it through `__root.tsx`:

```ts
export const Route = createRootRouteWithContext<{
  permissions: PermissionsMap | undefined;
  authReady: boolean;
}>()({ component: () => <Outlet /> });
```

In `App.tsx`, read `useCurrentUser()` and pass `{ permissions, authReady: !loading }` into `<RouterProvider router={router} context={{ permissions, authReady }} />`. Re-rendering with new context retriggers `beforeLoad` automatically.

For routes that depend on `authReady` (permissions still loading on cold start), guard with:

```ts
beforeLoad: ({ context }) => {
  if (!context.authReady) return; // let render show a spinner via pendingComponent
  requirePermission("users", "view")({ context });
};
```

Delete `ProtectedRoute.tsx`, `RequirePermission.tsx`, `RequireBrokerRequestsView.tsx`, `CarriersIndexRedirect.tsx`, `OutsideBrokersIndexRedirect.tsx` (their behavior moves into route definitions / `beforeLoad`).

### 5. Mass import-site rewrite (31 files)

A single find-and-replace pass — every import from `react-router-dom` swaps to `@tanstack/react-router` with API renames:

| react-router-dom | TanStack Router |
|---|---|
| `useNavigate()` returning `(to, opts) => void` | `useNavigate()` returning `({ to, search, replace, params }) => void` — call sites must use the object form |
| `useLocation()` | `useLocation()` (same shape: `{ pathname, search, hash }`) |
| `useSearchParams()` | `Route.useSearch()` (route-typed) or `useSearch({ strict: false })` (loose) |
| `<Link to="/x">` | `<Link to="/x">` (typed `to`; relative needs `from`) |
| `<NavLink to="x" className={({isActive}) => ...}>` | `<Link to="x" activeProps={{ className: "..." }} activeOptions={{ exact: false }}>` |
| `<Outlet/>` | `<Outlet/>` from `@tanstack/react-router` |
| `<Navigate to="x" replace/>` | inside `beforeLoad`: `throw redirect({ to: "x" })`. As a component leaf: `<Navigate to="x" replace />` from `@tanstack/react-router` (exists, slightly different prop shape) |

Concrete sweep targets:

- 11 files using `useNavigate`: rewrite call sites to `navigate({ to: "/foo" })`. Search-param navigations use `navigate({ to: ".", search: (prev) => ({ ...prev, q }) })`.
- 9 files using `useLocation`: usage is read-only (pathname/state). `state` is gone — for the LoginForm's `{ from }` redirect target, switch to typed search params on the `/login` route: `validateSearch: z.object({ from: z.string().optional() })`, then `Route.useSearch()` to read.
- 1 file (`UserManagementPage.tsx`) using `useSearchParams`: switch to the route's typed `useSearch()` + `navigate({ search })`.
- 2 files using `<NavLink>` (Carriers/OutsideBrokers tab layouts): map `className={({isActive})=>...}` → `activeProps={{ className: ... }}`.
- 4 files using `<Link>`: drop-in.
- 5 files using `<Outlet>`: drop-in (import path only).

### 6. RouterProvider mount (`apps/dashboard/src/app/App.tsx`)

Replace:

```ts
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/router";
// ...
<RouterProvider router={router} />
```

with:

```ts
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
// at module scope:
const router = createRouter({
  routeTree,
  context: { permissions: undefined, authReady: false }, // placeholder; real values injected below
  defaultPreload: "intent",
});
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
// inside <AuthProvider>:
const { permissions, loading } = useCurrentUser();
<RouterProvider router={router} context={{ permissions, authReady: !loading }} />
```

The `Register` augmentation is what makes `to=` strings autocomplete and type-check.

### 7. Test compatibility

- `UserManagementPage.test.tsx` currently imports `MemoryRouter`. Replace with:
  ```ts
  import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/user-management/users?..."] }) });
  render(<RouterProvider router={router} />);
  ```
  Or, simpler: render the component standalone if the test isn't asserting nav behavior. Inspect what the test actually exercises and pick the lighter option.

### 8. Cleanup

- Remove `react-router-dom` from `apps/dashboard/package.json`.
- Delete `src/routes/router.tsx` and the three guard files.
- Add `src/routeTree.gen.ts` to `apps/dashboard/.gitignore`.
- Run `pnpm --filter @twy/dashboard build` — TanStack codegen must produce a clean `routeTree.gen.ts`.

## Reused existing utilities

- `getIdToken` from `apps/dashboard/src/utils/jwt.ts` — keep, called from `_authed.tsx` `beforeLoad`.
- `useCurrentUser` hook — keep, used to feed router context in `App.tsx`.
- `canViewBrokerRequests` from `apps/dashboard/src/utils/permissions.ts` — keep, called from broker requests `beforeLoad`.
- `AppLayout`, `Sidebar`, `AccountingLayout`, `CarriersLayout`, `OutsideBrokersLayout`, `UserManagementLayout` — keep; only their import of `Outlet`/`NavLink` changes.
- All page components — unchanged.

## Verification

End-to-end check after the migration is in place:

1. `pnpm --filter @twy/dashboard exec tsc -p tsconfig.json --noEmit` — types pass (the `Register` augmentation should make `to="/loads"` strict).
2. `pnpm --filter @twy/dashboard build` — Vite plugin generates `routeTree.gen.ts` and the prod bundle builds.
3. `pnpm --filter @twy/dashboard test` — Vitest passes after the `MemoryRouter` fix.
4. `pnpm check:ci` — Biome clean (watch for unused imports left over from the sweep).
5. `pnpm --filter @twy/dashboard dev` and manually walk:
   - Logged-out user hitting `/loads` → redirected to `/login?from=/loads`.
   - Login → lands back on `/loads`.
   - Permission-denied route (e.g. user without `settings.view` visits `/settings`) → lands on `/profile` **without** the settings page flashing.
   - Tab layouts: Carriers / Outside-brokers NavLink active styling works.
   - User management `?tab=...` search-param state persists across navigation.
   - 404 splat renders `NotFound` for `/garbage`.
6. `grep -r "react-router" apps/dashboard/src` returns nothing.

## Out of scope

- Adding route-level `loader`s (TanStack supports them, but current code uses TanStack Query inside components — no need to move it).
- Adding `lazy()` / code-splitting (separate optimization; the migration preserves today's static-import behavior).
- Changing `AppHeader.tsx` (currently unmounted in the route tree — leave as-is or delete in a follow-up).
