# apps/dashboard — `@twy/dashboard`

React 19 + Vite 8 + Ant Design 6 SPA. Deployed via SST as a `sst.aws.StaticSite` mounted on a `sst.aws.Router` (defined in `infra/web.ts`). The single backend (per env) lives at `packages/functions`; this app talks to it via `apps/dashboard/src/libs/ApiClient.ts` — using a relative `/api` baseURL because the Router proxies same-origin requests to the API Gateway.

> Read root `CLAUDE.md` first. This file is the UI-specific delta.

## Stricter Biome rules apply here

Biome overrides in root `biome.json` (search `apps/dashboard/**`):

- `useExhaustiveDependencies: error` — every `useEffect`/`useCallback`/`useMemo` dep must be listed. Wrap fetchers in `useCallback`.
- `useHookAtTopLevel: error` — no conditional hooks.
- `useJsxKeyInIterable: error` — every list-rendered element gets a stable `key`.
- `useFragmentSyntax: warn` — prefer `<>...</>` over `<Fragment>`.
- `noNonNullAssertion: error` — no `value!`. Narrow with optional chaining + early return.

If you hit one of these in CI but not locally, run `pnpm check` (the editor extension autofixes; CI runs `biome ci` which does not).

## Source layout

```
src/
├── app/             # Entry only: App.tsx (provider tree) + index.tsx (Vite mount)
├── assets/          # Static files (images, fonts)
├── components/      # Shared UI primitives (GlobalErrorBoundary, UserDropdown, Logo, UserAvatar)
├── config/          # Global constants (navigationMap, apiMessages, searchConstants)
├── features/        # One sub-folder per domain
│   ├── auth/        #   api/, components/, pages/
│   ├── user/        #   api/, components/, pages/, types/
│   ├── branch/      #   api/, components/, pages/, types/
│   ├── load/        #   api/, components/, pages/, types/
│   ├── outside-broker/
│   └── outside-carrier/
├── hooks/           # Global reusable hooks (useCurrentUser)
├── layouts/         # Page wrappers (AppLayout, AppHeader, Sidebar)
├── libs/            # Shared libraries (ApiClient, fileApi, api-types, EventBus)
├── providers/       # React context providers (AuthProvider, AntdProvider)
├── routes/          # React Router config + guards (router, ProtectedRoute, RoleBasedRoute)
└── utils/           # Pure helpers (jwt, permissions, email, errorUtils, formatters)
```

## Stack at a glance

| Concern | Where | Notes |
|---|---|---|
| Routing | `src/routes/router.tsx` | `react-router-dom@7`, `RouterProvider`. |
| Layout | `src/layouts/{AppLayout,AppHeader,Sidebar}.tsx` | AntD `<Layout>`. |
| Auth context | `src/providers/AuthProvider.tsx` | `useAuth()` for `{login, logout}`. |
| Route guards | `src/routes/{ProtectedRoute,RoleBasedRoute}.tsx` | JWT check + role gate. |
| Tokens | `src/utils/jwt.ts` | **Cookies via `js-cookie`**, not `localStorage`. |
| API | `src/libs/ApiClient.ts` | Axios singleton with relative `/api` baseURL + auth interceptor + token refresh. Never use raw `axios`/`fetch`. |
| Server state | `ahooks` | `useAntdTable` for paginated tables, `useRequest` for mutations/aux data, `useDebounce` for search. |
| Modals | Custom providers | Each domain has a `providers/<Domain>ModalProvider.tsx` that manages open state and renders modal/drawer components. Consume via `use<Domain>Modal()` hook. |
| Permissions | `src/utils/permissions.ts` | `MenuFeature` enum drives sidebar items + `<RequirePermission resource="..." action="view">`. |
| Charts | `@ant-design/charts@2.6.7` | Already installed. |
| Tables | `antd` `<Table>` | Use proper column generic types — don't `any` columns. |

## Per-origin auth (multi-domain)

A user signed in on `twy.am` is **not** signed in on `twy.be` even though both hit the same backend. Cookies are scoped per origin. This is by design — see root `CLAUDE.md` "Domains (multi-domain deploy)". Don't try to share tokens across domains.

## Same-origin /api routing

`infra/web.ts` calls `router.routeUrl("/api/*", api.api.url)`, which means every request the SPA makes to `/api/...` is proxied through CloudFront to the API Gateway. The Axios baseURL stays `/api` and there are no CORS preflights in production. Locally during `vite dev`, the proxy in `vite.config.mts` covers the same role against the deployed dev backend.

## Vite envs

Files at `apps/dashboard/.env.development` and `apps/dashboard/.env.production` are **committed** (`.gitignore` exception). They hold **public, build-time** values only — never put a secret here, since these get bundled into the JS the browser downloads.

## Dev proxy

`vite.config.mts` proxies `/api` → `https://dev.twy.am` and `/s3-proxy` → the dev S3 bucket. So `pnpm run:dashboard` works against the dev backend with no extra setup.

## Adding a new page

1. Create `src/features/<domain>/pages/<Name>Page.tsx` with a default export.
2. Wire the route in `src/routes/router.tsx`, wrapped in `<ProtectedRoute>` and `<RequirePermission resource="..." action="view">`.
3. Add a `MenuFeature` enum entry in `src/utils/permissions.ts` if it needs a sidebar entry.
4. Add a sidebar item in `src/layouts/Sidebar.tsx` with the matching `resource` key.
5. Use `useAntdTable` for paginated tables, `useRequest` (manual) for mutations, `useDebounce` for search inputs.
6. For create/edit modals or drawers, create a `providers/<Domain>ModalProvider.tsx` and consume via `use<Domain>Modal()`.

## AntD documentation

When you need to look up AntD component APIs, props, or usage examples, fetch `https://ant.design/llms-full.txt` — it's the LLM-optimised full reference for the current version.

## Common UI footguns

- **Inline arrow inside `useEffect` dep array** → `useExhaustiveDependencies` error. Lift to `useCallback`.
- **`!` to silence "possibly undefined"** → biome error in this app. Do an early return or use `?.`.
- **New API call with raw `fetch`/`axios`** → bypasses the auth interceptor and the error handler. Always go through `ApiClient` from `src/libs/ApiClient.ts`.
- **`localStorage.getItem("accessToken")`** → wrong; use `getAccessToken()` from `src/utils/jwt.ts`.
- **AntD v5 patterns (e.g. `Tooltip` `title` typing)** — we're on AntD v6. Some props/types changed.
- **`<Modal open={x}>` with state in a sibling** — leaks state. Use the domain's `ModalProvider` pattern (see `features/branch/providers/BranchModalProvider.tsx` as a reference).

## Build & test

```bash
pnpm --filter @twy/dashboard dev          # vite dev server
pnpm --filter @twy/dashboard build        # tsc + vite build → out/
pnpm --filter @twy/dashboard exec vitest run path/to/file.test.tsx
```

## Deploy

Deployment is owned by SST at the root — there are no per-app `synth/diff/deploy` scripts. The Vite build happens automatically as part of `sst deploy` (configured in `infra/web.ts` via the `sst.aws.StaticSite` `build` block, output dir `out/`). The Router uploads the bundle to its S3 origin and invalidates the distribution.
