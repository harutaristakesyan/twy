# Plan: Remove `@ebay/nice-modal-react`, manage modals via `react-router-dom` paths

## Context

`apps/dashboard` uses `@ebay/nice-modal-react@1.2.13` to imperatively open 15 modals from button handlers via a thin wrapper at `src/libs/modals.ts` (`showModal(Component, props)`). The pattern hides modal state from the URL — refreshing the page closes the modal, links can't deep‑link to an "edit user" dialog, and every callsite has to thread an `onSuccess` callback for the list to refetch after a mutation.

We want modal state to live in the URL via nested **path segments** on `react-router-dom@7` (the router locked in by commit `8567` after the TanStack experiment was reverted). After the change, `/loads/abc-123/edit` deep-links to "Loads list with the edit modal open on load `abc-123`," refresh keeps the modal open, and modals signal "thing changed" through React Query cache invalidation instead of callback props.

**Outcomes:**
- 15 modals open via `<Link>` / `navigate()` instead of `showModal`.
- `nice-modal-react`, `src/libs/modals.ts`, and the two stub `*ModalProvider.tsx` files are deleted.
- `App.tsx` no longer wraps the tree in `<NiceModal.Provider>`.
- List queries refresh through `queryClient.invalidateQueries(...)` from inside each modal — `onSuccess` props are gone.

## Design (locked)

- **URL shape:** path segments as nested children of the list route. Example: `/loads/:loadId/edit`, `/users/create`, `/branches/:branchId/edit`.
- **Refresh signal:** `queryClient.invalidateQueries({ queryKey: [...] })` inside the modal's mutation `onSuccess`. The `useApiMutation` wrapper at `apps/dashboard/src/libs/query.ts` already exposes the query client; if not, import directly from `@/libs/queryClient`.
- **Render strategy:** Each list page adds a sibling `<Outlet />` to its existing JSX. HeroUI `Modal` portals over the page anyway, so the list stays visually behind the modal. No background-location hack, no dual `<Routes>` trees.
- **Close interaction:** modals call `navigate("..")` (or a `useCloseModal()` hook that wraps it) when the HeroUI Modal `onOpenChange` fires false or after a successful mutation. They no longer call `modal.hide()`.
- **Edit modals receive id, not entity:** the modal reads `useParams()`, then pulls the entity from the React Query cache or refetches by id. This matches the path-segment design (URL only holds the id).

## Route mapping (15 modals → 16 new routes)

Each entry is **child route of an existing page**. Add `<Outlet />` at the bottom of the parent page's JSX.

| Modal | New route | Parent that gains `<Outlet />` |
|---|---|---|
| `LoadEditModal` | `/loads/:loadId/edit` | `features/load/pages/LoadsPage.tsx` |
| `StatusUpdateModal` | `/loads/:loadId/status` | `features/load/pages/LoadsPage.tsx` |
| `CarrierCreateModal` (kind=twy) | `/carriers/twy/create` | `features/carrier/pages/TwyCarriersTab.tsx` |
| `CarrierEditModal` (twy) | `/carriers/twy/:carrierId/edit` | `features/carrier/pages/TwyCarriersTab.tsx` |
| `CarrierCreateModal` (kind=outside) | `/carriers/outside/create` | `features/carrier/pages/OutsideCarriersTab.tsx` |
| `CarrierEditModal` (outside) | `/carriers/outside/:carrierId/edit` | `features/carrier/pages/OutsideCarriersTab.tsx` |
| `OutsideBrokerCreateModal` | `/outside-brokers/directory/create` | `features/outside-broker/pages/OutsideBrokersPage.tsx` |
| `OutsideBrokerEditModal` | `/outside-brokers/directory/:brokerId/edit` | same |
| `UserCreateModal` | `/user-management/users/create` | `features/user/pages/UsersPage.tsx` |
| `UserEditModal` | `/user-management/users/:userId/edit` | same |
| `ChangePasswordModal` | `/profile/change-password` | `features/user/pages/ProfilePage.tsx` |
| `BranchCreateModal` | `/branches/create` | `features/branch/pages/BranchesPage.tsx` |
| `BranchEditModal` | `/branches/:branchId/edit` | same |
| `CICreateModal` | `<settings parent>/community-licenses/create` | `features/community-license/pages/CIManagementPage.tsx` *(confirm the exact mount path — this page isn't in `router.tsx` directly; locate it inside `SettingsPage` and pick a path that aligns)* |
| `CIEditModal` | `<settings parent>/community-licenses/:ciId/edit` | same |
| `CreateLoadPaymentOrderModal` | `/accounting/payment-orders/create-load-po` | `features/accounting/components/LoadPaymentOrdersTab.tsx` *(tab rendered inside `PaymentOrdersPage` — see note below)* |
| `CreateOfficeExpenseModal` | `/accounting/payment-orders/create-office-po` | `features/accounting/components/OfficeExpensePOTab.tsx` |

> Tab notes: `LoadPaymentOrdersTab` and `OfficeExpensePOTab` are tabs *inside* `PaymentOrdersPage`. Since they share the same route (`/accounting/payment-orders`), mount the `<Outlet />` once in `PaymentOrdersPage` and register both create-modal routes there. The active tab in the page UI doesn't need to match the modal route — the modal renders over whichever tab the user happens to be on. Pick stable, kind-disambiguated path suffixes (`create-load-po` vs `create-office-po`).

## Files to modify

### Router

- **`apps/dashboard/src/routes/router.tsx`** — replace each leaf route element with a route node that has `children: [...]` listing the modal routes (or, if the page is the layout for tabs, keep current structure and add modal routes under the relevant tab). Permission gating stays on the parent route via `RequirePermission`; we don't add new guards (route-level checks only verify `view` per `apps/dashboard/CLAUDE.md`, and the callsites that opened these modals already lived behind those view checks). Example:

  ```tsx
  {
    path: "loads",
    element: (
      <RequirePermission resource="loads" action="view">
        <LoadsPage />
      </RequirePermission>
    ),
    children: [
      { path: ":loadId/edit", element: <LoadEditModal /> },
      { path: ":loadId/status", element: <StatusUpdateModal /> },
    ],
  }
  ```

  The existing `path: "loads/create"` keeps using `CreateLoadPage` (full page, not a modal — unchanged).

### Each list page — add `<Outlet />`

Files (all under `apps/dashboard/src/`):
- `features/load/pages/LoadsPage.tsx`
- `features/user/pages/UsersPage.tsx`
- `features/branch/pages/BranchesPage.tsx`
- `features/user/pages/ProfilePage.tsx`
- `features/carrier/pages/TwyCarriersTab.tsx`
- `features/carrier/pages/OutsideCarriersTab.tsx`
- `features/outside-broker/pages/OutsideBrokersPage.tsx`
- `features/community-license/pages/CIManagementPage.tsx`
- `features/accounting/pages/PaymentOrdersPage.tsx`

Pattern:

```tsx
import { Outlet } from "react-router-dom";
// ...existing JSX...
return (
  <>
    {/* existing page content */}
    <Outlet />
  </>
);
```

### Each modal component — switch from `NiceModal.create` to a plain route component

Files:
- `features/load/components/LoadEditModal.tsx`
- `features/load/components/StatusUpdateModal.tsx`
- `features/carrier/components/CarrierCreateModal.tsx`
- `features/carrier/components/CarrierEditModal.tsx`
- `features/outside-broker/components/OutsideBrokerCreateModal.tsx`
- `features/outside-broker/components/OutsideBrokerEditModal.tsx`
- `features/user/components/UserCreateModal.tsx`
- `features/user/components/UserEditModal.tsx`
- `features/user/components/ChangePasswordModal.tsx`
- `features/branch/components/BranchCreateModal.tsx`
- `features/branch/components/BranchEditModal.tsx`
- `features/community-license/components/CICreateModal.tsx`
- `features/community-license/components/CIEditModal.tsx`
- `features/accounting/components/CreateLoadPaymentOrderModal.tsx`
- `features/accounting/components/CreateOfficeExpenseModal.tsx`

Conversion pattern for an **edit** modal (uses `useParams` + cached entity):

```tsx
// Before
type Props = { load: Load; onSuccess?: () => void };
const LoadEditModal = NiceModal.create<Props>(({ load, onSuccess }) => {
  const modal = useModal();
  // ...mutation.onSuccess: modal.hide(); onSuccess?.();
});

// After
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const LoadEditModal = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const load = useLoadById(loadId);                // see "Edit data source" below
  if (!load) return null;                          // or a Spinner while it loads

  const close = () => navigate("..");

  const mutation = useApiMutation(updateLoad, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["loads"] });
      close();
    },
  });

  return (
    <Modal isOpen onOpenChange={(open) => { if (!open) close(); }}>
      {/* unchanged form JSX */}
    </Modal>
  );
};
export default LoadEditModal;
```

Conversion pattern for a **create** modal (no id, no entity fetch):

```tsx
const UserCreateModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const mutation = useApiMutation(createUser, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      close();
    },
  });
  return <Modal isOpen onOpenChange={(o) => !o && close()}>{/* form */}</Modal>;
};
```

For `CarrierCreateModal`, derive `kind` from the URL (`useMatch("/carriers/twy/create")` or pass via a `kind` route prop wrapper) instead of from a prop. Simplest: register two thin wrappers in `router.tsx`:

```tsx
{ path: "create", element: <CarrierCreateModal kind="twy" /> },
// and "outside" under the other tab
```

### Each callsite — replace `showModal` with `<Link>` or `navigate`

Files:
- `features/load/pages/LoadsPage.tsx:91,100`
- `features/carrier/components/CarrierTable.tsx:94,103`
- `features/outside-broker/components/OutsideBrokersManagementTable.tsx:79,87`
- `features/user/pages/UsersPage.tsx:67,72`
- `features/user/components/UserSelfUpdate.tsx:174`
- `features/branch/pages/BranchesPage.tsx:73,78`
- `features/community-license/pages/CIManagementPage.tsx:64,69`
- `features/accounting/components/LoadPaymentOrdersTab.tsx:62`
- `features/accounting/components/OfficeExpensePOTab.tsx:75`

Pattern: use **relative** navigation so the same component works under each tab. Inside `CarrierTable` (used by both twy and outside tabs):

```tsx
// Before
const handleEdit = (carrier: Carrier) => {
  void showModal(CarrierEditModal, { carrier, onSuccess: () => void table.refetch() });
};

// After
const navigate = useNavigate();
const handleEdit = (carrier: Carrier) => navigate(`${carrier.id}/edit`);
```

For row actions that previously took a row object, the relative path encodes only the id. For "Create" buttons, `navigate("create")`. For the `kind=twy|outside` discriminator on carriers, the relative path naturally inherits the tab — no extra arg needed.

The `table.refetch()` calls inside the existing `onSuccess` are dropped — the modal's `invalidateQueries` will trigger React Query to refetch the same list query (assuming the list uses a stable query key like `["carriers", { kind }]`). If a list isn't currently driven by React Query (e.g. uses `useAntdTable` from ahooks with manual state), wire it through `useApiQuery` or call `queryClient.invalidateQueries` *plus* expose a `refetch` from the table that the modal can't easily call — in that case, listen on a `["mutation:lastSucceededAt", "loads"]` sentinel query key, or keep a thin `EventBus` notification (already exists at `libs/EventBus.ts`). **Recommended in this codebase:** stick to React Query — convert any ahooks-driven list to `useApiQuery` if it isn't already.

### Edit data source helper (per feature, optional but recommended)

For edit modals, add a tiny lookup hook so the modal doesn't have to know how the list fetched:

```ts
// features/load/api/useLoadById.ts
export const useLoadById = (id: string | undefined) => {
  return useApiQuery({
    queryKey: ["load", id],
    queryFn: () => loadApi.getById(id!),
    enabled: !!id,
  });
};
```

If a `getById` endpoint doesn't exist for a domain, the modal can also try `queryClient.getQueryData(["loads"])?.items.find(...)` as a synchronous cache fallback before issuing a network call. Either is fine — pick per feature.

### App root cleanup

- **`apps/dashboard/src/app/App.tsx`** — remove `import NiceModal from "@ebay/nice-modal-react"` and the `<NiceModal.Provider>` wrapper. The provider tree becomes `QueryClientProvider → Toast.Provider → AuthProvider → RouterProvider`.

### Files to delete

- `apps/dashboard/src/libs/modals.ts` (the `showModal`/`hideModal` wrapper)
- `apps/dashboard/src/features/outside-broker/providers/OutsideBrokerModalProvider.tsx` (stale stub)
- `apps/dashboard/src/features/carrier/providers/CarrierModalProvider.tsx` (stale stub)

### Package change

- `apps/dashboard/package.json` — remove `@ebay/nice-modal-react` from `dependencies`. Run `pnpm install` to update the lockfile.

### Docs sync

- **`apps/dashboard/CLAUDE.md`** — the "Modals" row in the stack table currently reads "Custom providers / `use<Domain>Modal()` hook"; replace with: "Modals — child routes of their list page; opened by `<Link>`/`navigate()`; close by `navigate('..')`; refresh by `queryClient.invalidateQueries`." Also update the "Adding a new page" step 6 ("For create/edit modals or drawers, create a `providers/<Domain>ModalProvider.tsx`...") to describe the route-based pattern.

## Verification

End-to-end (must do all):

1. **Unit / type pass** — `pnpm --filter @twy/dashboard build` (tsc + vite build) succeeds with `@ebay/nice-modal-react` removed from imports and `package.json`.
2. **Lint / format** — `pnpm check:ci` is clean.
3. **Tests** — `pnpm --filter @twy/dashboard test` is green. `UserManagementPage.test.tsx` already wraps with `MemoryRouter`; check that nested-routes tests don't need a different initialEntries.
4. **Manual smoke per feature** — run `pnpm run:dashboard` and for each domain:
   - Click the Create button → URL changes to `/<list>/create` → modal opens. Submit → modal closes, list refreshes, URL returns to `/<list>`.
   - Click a row's Edit (or Status, for loads) → URL becomes `/<list>/:id/<action>` → modal opens prefilled. Submit → modal closes, list refreshes.
   - Refresh on a modal URL (e.g. paste `/loads/abc-123/edit` into the address bar) → page loads with modal already open over the list.
   - Close via the modal's X button → `navigate("..")` returns to the list.
   - Browser back from an open modal → modal closes (history pop).
5. **No regressions in cross-tab modals** — carriers `twy` vs `outside`: open create on each tab, confirm the discriminator is preserved (the right API endpoint is hit) and refresh keeps you on the right tab.
6. **Grep gates** before commit:
   ```bash
   grep -rn "nice-modal" apps/dashboard/src   # zero hits
   grep -rn "NiceModal"  apps/dashboard/src   # zero hits
   grep -rn "showModal\|hideModal" apps/dashboard/src   # zero hits
   ```
7. **`/verify`** (project gate) before `/ship`.

## Out of scope

- Tab-state encoding in URLs for carriers/outside-brokers/accounting (already handled by the existing `<NavLink>` setup).
- Replacing HeroUI Modal with anything else.
- Permission gating at the *action* level (e.g. "can edit this carrier"); we keep the existing pattern where button visibility is checked in the callsite and route-level checks only verify `view`.
- Converting `useAntdTable`-driven lists to `useApiQuery` *en masse* — only convert per feature if the modal's `invalidateQueries` doesn't reach the list. Track separately.
