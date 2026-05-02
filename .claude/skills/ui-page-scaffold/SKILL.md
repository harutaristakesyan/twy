---
name: ui-page-scaffold
description: Use when adding a new page or feature route to apps/dashboard. Covers the AntD 6 + TanStack Query + react-router-dom 7 + ApiClient pattern, AuthContext gating, the MenuFeature permission enum, and how to wire the route into the router/layout.
---

# UI page scaffold

## When this skill applies

- Adding a new top-level page under `apps/dashboard/src/pages/`.
- Adding a new feature module that needs API calls + a route.
- Diagnosing why a page renders blank or hits a redirect loop.

## Conventions in apps/dashboard

- **React 19**, JSX runtime is `react-jsx` (no need for `import React`).
- **Ant Design 6**: `import { Button, Table, Form, ... } from "antd"`. Icons from `@ant-design/icons`.
- **TanStack Query v5** for server state. Query key is a const tuple. No raw `useEffect` for data fetching.
- **react-router-dom 7**: `useNavigate`, `useParams`, `Outlet`, `RouterProvider`.
- **Auth**: `useAuth()` from `apps/dashboard/src/auth/AuthContext.tsx` returns `{ user, login, logout }`. Routes that need auth wrap with `<ProtectedRoute>`. Routes that need a role wrap with `<RoleBasedRoute requires={MenuFeature.X}>`.
- **API**: import `ApiClient` from `apps/dashboard/src/shared/api/ApiClient.ts`. Never use raw `axios` or `fetch`.
- **Token storage**: cookies via `js-cookie` (see `apps/dashboard/src/shared/utils/jwt.ts`). Never `localStorage`.
- **Modals**: `@ebay/nice-modal-react` — `NiceModal.create(...)` and `NiceModal.show(...)`.
- **Stricter Biome rules apply here**: `useExhaustiveDependencies: error`, `useHookAtTopLevel: error`, `noNonNullAssertion: error`. Wrap fetchers in `useCallback`.

## New page checklist

1. **Create the page component** under `apps/dashboard/src/pages/<Name>Page.tsx`:

```tsx
import { Card, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiClient } from "@/shared/api/ApiClient";

export const ExamplePage = () => {
  const fetchData = useCallback(async () => {
    return ApiClient.get<{ items: ExampleItem[] }>("/example");
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["example"],
    queryFn: fetchData,
  });

  if (isLoading) return <Spin />;
  if (error) return <Card>Failed to load: {String(error)}</Card>;

  return (
    <Card title="Example">
      {/* render data.items */}
    </Card>
  );
};

export default ExamplePage;
```

2. **Add the route** in `apps/dashboard/src/app/routes/router.tsx`:

```tsx
{
  path: "/example",
  element: (
    <ProtectedRoute>
      <RoleBasedRoute requires={MenuFeature.EXAMPLE}>
        <ExamplePage />
      </RoleBasedRoute>
    </ProtectedRoute>
  ),
}
```

3. **Add a permission entry** in `apps/dashboard/src/shared/utils/permissions.ts` if the feature is gated by role. Add the menu item to the sidebar (`apps/dashboard/src/app/layouts/Sidebar.tsx`).

4. **TanStack Query setup** is in `App.tsx` — no per-page `QueryClient` needed.

## Common mistakes

- **`useEffect` for data** instead of `useQuery` — fights the cache, retries are wrong, error state is awkward.
- **Inline arrow functions in `useEffect` deps** — biome error. Wrap in `useCallback`.
- **Reading `localStorage` for tokens** — wrong; use `getAccessToken()` from `apps/dashboard/src/shared/utils/jwt.ts`.
- **`<Modal>` inside a render tree** instead of `NiceModal` — leaks state.
- **`!` non-null assertion** — biome error in `apps/dashboard/**`. Narrow with optional chaining + early return.
- **Hardcoded `/api/...` strings** — use the `ApiClient` methods which prepend the base URL.

## Testing a page

Vitest + `@testing-library/react`. Wrap with `QueryClientProvider`, `MemoryRouter`, `ConfigProvider`, `AuthContext.Provider` (mock the user). Mock `ApiClient` module, not axios.
