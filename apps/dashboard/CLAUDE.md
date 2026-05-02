# apps/dashboard — `@twy/dashboard`

React 19 + Vite 8 + Ant Design 6 SPA. Deployed via SST as a `sst.aws.StaticSite` mounted on a `sst.aws.Router` (defined in `infra/web.ts`). The single backend (per env) lives at `apps/auth` + `apps/functions`; this app talks to it via `apps/dashboard/src/shared/api/ApiClient.ts` — using a relative `/api` baseURL because the Router proxies same-origin requests to the API Gateway.

> Read root `CLAUDE.md` first. This file is the UI-specific delta.

## Stricter Biome rules apply here

Biome overrides in root `biome.json` (search `apps/dashboard/**`):

- `useExhaustiveDependencies: error` — every `useEffect`/`useCallback`/`useMemo` dep must be listed. Wrap fetchers in `useCallback`.
- `useHookAtTopLevel: error` — no conditional hooks.
- `useJsxKeyInIterable: error` — every list-rendered element gets a stable `key`.
- `useFragmentSyntax: warn` — prefer `<>...</>` over `<Fragment>`.
- `noNonNullAssertion: error` — no `value!`. Narrow with optional chaining + early return.

If you hit one of these in CI but not locally, run `pnpm check` (the editor extension autofixes; CI runs `biome ci` which does not).

## Stack at a glance

| Concern | Where | Notes |
|---|---|---|
| Routing | `src/app/routes/router.tsx` | `react-router-dom@7`, `RouterProvider`. |
| Layout | `src/app/layouts/{Layout,AppHeader,Sidebar}.tsx` | AntD `<Layout>`. |
| Auth | `src/auth/AuthContext.tsx`, `src/auth/{ProtectedRoute,RoleBasedRoute}.tsx` | `useAuth()` for `{user, login, logout}`. |
| Tokens | `src/shared/utils/jwt.ts` | **Cookies via `js-cookie`**, not `localStorage`. |
| API | `src/shared/api/ApiClient.ts` | Axios singleton with relative `/api` baseURL + auth interceptor + token refresh + mock interceptor. Never use raw `axios`/`fetch`. |
| Mocks | `src/shared/api/mockInterceptor.ts` | Toggle via `VITE_ENABLE_MOCKS=true` in `.env.development`. Mock interceptor must init **before** the auth interceptor. |
| Server state | `@tanstack/react-query@5` | `useQuery`/`useMutation`. Query keys are tuples — see queries.ts. |
| Modals | `@ebay/nice-modal-react` | `NiceModal.create(...)`, `NiceModal.show(...)`. |
| Permissions | `src/shared/utils/permissions.ts` | `MenuFeature` enum drives sidebar items + `<RoleBasedRoute requires={...}>`. |
| Charts | `@ant-design/charts@2.6.7` | Already installed. |
| Tables | `antd` `<Table>` | Use proper column generic types — don't `any` columns. |

## Per-origin auth (multi-domain)

A user signed in on `twy.am` is **not** signed in on `twy.be` even though both hit the same backend. Cookies are scoped per origin. This is by design — see root `CLAUDE.md` "Domains (multi-domain deploy)". Don't try to share tokens across domains.

## Same-origin /api routing

`infra/web.ts` calls `router.routeUrl("/api/*", api.api.url)`, which means every request the SPA makes to `/api/...` is proxied through CloudFront to the API Gateway. The Axios baseURL stays `/api` and there are no CORS preflights in production. Locally during `vite dev`, the proxy in `vite.config.mts` covers the same role against the deployed dev backend.

## Vite envs

Files at `apps/dashboard/.env.development` and `apps/dashboard/.env.production` are **committed** (`.gitignore` exception). They hold **public, build-time** values only:

```
VITE_ENABLE_MOCKS=false
VITE_MOCK_DELAY=500
```

Never put a secret here — these get bundled into the JS the browser downloads.

## Dev proxy

`vite.config.mts` proxies `/api` → `https://dev.twy.am` and `/s3-proxy` → the dev S3 bucket. So `pnpm run:ui` works against the dev backend with no extra setup.

## Adding a new page

Use the `ui-page-scaffold` skill (under `.claude/skills/`). The short version:

1. `src/pages/<Name>Page.tsx` with a default export.
2. Wire route in `src/app/routes/router.tsx`, wrapped in `<ProtectedRoute>` and (if role-gated) `<RoleBasedRoute>`.
3. Add `MenuFeature` enum entry in `src/shared/utils/permissions.ts` if role-gated.
4. Add sidebar item in `src/app/layouts/Sidebar.tsx`.
5. Use `useQuery` for data, `useMutation` for writes. Wrap fetchers in `useCallback`.

## Common UI footguns

- **Inline arrow inside `useEffect` dep array** → `useExhaustiveDependencies` error. Lift to `useCallback`.
- **`!` to silence "possibly undefined"** → biome error in this app. Do an early return or use `?.`.
- **New API call with raw `fetch`/`axios`** → bypasses the auth interceptor, the mock layer, and the error handler. Always go through `ApiClient`.
- **`localStorage.getItem("accessToken")`** → wrong; use `getAccessToken()` from `src/shared/utils/jwt.ts`.
- **AntD v5 patterns (e.g. `Tooltip` `title` typing)** — we're on AntD v6. Some props/types changed.
- **`<Modal open={x}>` with state in a sibling** — leaks state. Use `NiceModal`.

## Build & test

```bash
pnpm --filter @twy/dashboard dev          # vite dev server
pnpm --filter @twy/dashboard build        # tsc + vite build → out/
pnpm --filter @twy/dashboard exec vitest run path/to/file.test.tsx
```

## Deploy

Deployment is owned by SST at the root — there are no per-app `synth/diff/deploy` scripts. The Vite build happens automatically as part of `sst deploy` (configured in `infra/web.ts` via the `sst.aws.StaticSite` `build` block, output dir `out/`). The Router uploads the bundle to its S3 origin and invalidates the distribution.
