---
name: ui-page-scaffold
description: Use when adding a new page or feature route to apps/dashboard. Covers the HeroUI v3 + Tailwind v4 + TanStack Query v5 + react-router-dom 7 pattern, AuthProvider gating, RequirePermission, the MenuFeature enum, route-based modals, and how to wire the page into the router/sidebar.
---

# UI page scaffold

## When this skill applies

- Adding a new page under `apps/dashboard/src/features/<domain>/pages/`.
- Adding a new feature module that needs API calls + a route.
- Diagnosing why a page renders blank, hits a redirect loop, or refetches on every render.

## Conventions in apps/dashboard

- **React 19**, JSX runtime is `react-jsx` (no `import React`).
- **HeroUI v3**: `import { Button, Table, Input, Modal, ... } from "@heroui/react"`. Icons via `lucide-react`.
- **Tailwind v4** for layout/utility; no CSS-in-JS.
- **TanStack Query v5** for server state. Query key is a const tuple. No raw `useEffect` for data fetching.
- **react-router-dom 7**: `useNavigate`, `useParams`, `Outlet`, `RouterProvider`.
- **Auth**: `useAuth()` from `apps/dashboard/src/providers/AuthProvider.tsx` returns `{ login, logout, authMe, refetchAuthMe, userLoading }`. Routes that need auth wrap with `<ProtectedRoute>`. Routes that need a permission wrap with `<RequirePermission resource="..." action="view">`.
- **API**: import `ApiClient` from `apps/dashboard/src/libs/ApiClient.ts`. Never use raw `axios` or `fetch`.
- **Token storage**: cookies via `js-cookie` (see `apps/dashboard/src/utils/jwt.ts`). Never `localStorage`.
- **Modals are routes**: open via `navigate("create")` / `navigate(\`${id}/edit\`)`, close via `navigate("..")`. No state-driven `<Modal isOpen={x}>` in a sibling.
- **Stricter Biome rules apply here**: `useExhaustiveDependencies: error`, `useHookAtTopLevel: error`, `noNonNullAssertion: error`. Wrap fetchers in `useCallback`.

## New page checklist

1. **Create the page component** under `apps/dashboard/src/features/<domain>/pages/<Name>Page.tsx`:

```tsx
import { Card, CardBody, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApiClient } from "@/libs/ApiClient";

export const ExamplePage = () => {
  const fetchData = useCallback(async () => {
    return ApiClient.get<{ items: ExampleItem[] }>("/example");
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["example"],
    queryFn: fetchData,
  });

  if (isLoading) return <Spinner />;
  if (error) return <Card><CardBody>Failed to load: {String(error)}</CardBody></Card>;

  return (
    <Card>
      <CardBody>{/* render data.items */}</CardBody>
    </Card>
  );
};

export default ExamplePage;
```

2. **Add the route** in `apps/dashboard/src/routes/router.tsx`:

```tsx
{
  path: "/example",
  element: (
    <ProtectedRoute>
      <RequirePermission resource="example" action="view">
        <ExamplePage />
      </RequirePermission>
    </ProtectedRoute>
  ),
}
```

3. **Add a permission entry** in `apps/dashboard/src/utils/permissions.ts` if the feature is gated. Add the menu item to `apps/dashboard/src/layouts/Sidebar.tsx` with the matching `resource` key.

4. **TanStack Query setup** lives in `App.tsx` — no per-page `QueryClient` needed.

5. **For create/edit modals**, declare them as child routes of the list page and render an `<Outlet />` in the list page. Mutations invalidate the list's query key in `onSuccess`.

## Common mistakes

- **`useEffect` for data** instead of `useQuery` — fights the cache, retries are wrong, error state is awkward.
- **Inline arrow functions in `useEffect` deps** — biome error. Wrap in `useCallback`.
- **Reading `localStorage` for tokens** — wrong; use `getAccessToken()` from `apps/dashboard/src/utils/jwt.ts`.
- **State-driven modal in a sibling** — leaks state across navigations. Use the route-based modal pattern.
- **`!` non-null assertion** — biome error in `apps/dashboard/**`. Narrow with optional chaining + early return.
- **Hardcoded `/api/...` strings** — use the `ApiClient` methods which prepend the base URL.
- **Stale list after mutation** — invalidate the list `queryKey` in the mutation's `onSuccess`.

## Testing a page

Vitest + `@testing-library/react`. Wrap with `QueryClientProvider`, `MemoryRouter`, the `HeroUIProvider`, and an `AuthProvider` (mock the user). Mock the `ApiClient` module, not axios.
