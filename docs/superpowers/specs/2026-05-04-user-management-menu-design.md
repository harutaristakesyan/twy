# User Management Menu Design

**Date:** 2026-05-04  
**Status:** Approved

## Problem

The sidebar has two separate entries — "Users" (at `/`) and "Teams" (at `/teams`) — that both belong to the same concern. The goal is to merge them under a single "User Management" menu item while keeping their permissions entirely separate.

## Decision

Use a single sidebar item ("User Management") that navigates to `/user-management`. Inside that page, an Ant Design `<Tabs>` component shows Users and Teams as tabs. The tab bar is hidden when the user only has one of the two permissions — the table renders directly without any tab chrome.

## Design

### Sidebar (`Sidebar.tsx`)

Remove the separate `users` and `teams` items. Add one item:

```ts
{
  key: "/user-management",
  icon: <TeamOutlined />,
  label: "User Management",
  resources: ["users", "teams"],  // shown if EITHER resource has view permission
}
```

The existing filter logic (`item.resources.some(r => permissions[r]?.view)`) already handles OR semantics — no change needed there.

### Routes (`router.tsx`)

| Old | New |
|-----|-----|
| `/` → `<RequirePermission resource="users"><UsersPage /></RequirePermission>` | `/user-management` → `<UserManagementPage />` |
| `/teams` → `<RequirePermission resource="teams"><TeamsPage /></RequirePermission>` | removed |
| *(no redirect)* | `/` → `<Navigate to="/user-management" />` |

`UserManagementPage` handles its own permission-aware rendering; it does not use `RequirePermission` as a wrapper.

### `UserManagementPage` (new file)

Location: `apps/dashboard/src/features/user/pages/UserManagementPage.tsx`

Logic:

1. Read `permissions.users?.view` and `permissions.teams?.view` from `useCurrentUser()`.
2. If both are true → render `<Tabs>` with two tab panes:
   - **Users** (default, `?tab=users` or no param): `<UserModalProvider><UserManagementTable /></UserModalProvider>`
   - **Teams** (`?tab=teams`): `<TeamModalProvider><TeamManagementTable /></TeamModalProvider>`
3. If only `users.view` → render `<UserModalProvider><UserManagementTable /></UserModalProvider>` directly (no `<Tabs>`).
4. If only `teams.view` → render `<TeamModalProvider><TeamManagementTable /></TeamModalProvider>` directly (no `<Tabs>`).
5. If neither → should not be reachable (sidebar filters the item out), but render `null` as a safety fallback.

Tab state is synced with the URL via a `tab` query param (`?tab=teams`). The Ant Design `Tabs` `activeKey` is derived from `useSearchParams`.

### Permissions — unchanged

The existing `users` and `teams` resources, their actions (`view`, `edit`, `add`), and the `RequirePermission` guard logic are not modified. `UserManagementPage` reads permissions directly and renders conditionally.

### Files changed

| File | Change |
|------|--------|
| `apps/dashboard/src/features/user/pages/UserManagementPage.tsx` | **New** — combined page with permission-aware tab rendering |
| `apps/dashboard/src/layouts/Sidebar.tsx` | Merge two items into one `user-management` entry |
| `apps/dashboard/src/routes/router.tsx` | Update routes; add `/` redirect |

### Files untouched

- `UsersPage.tsx`, `TeamsPage.tsx` — not used directly by the router anymore but their internal components (`UserManagementTable`, `TeamManagementTable`, modal providers) are reused inside `UserManagementPage`.
- `permissions.ts`, `RequirePermission.tsx` — no changes.
- All backend files.

## Out of scope

- Changing the `users` or `teams` resource names or permission actions.
- Any backend or Lambda changes.
- Modifying `UsersPage.tsx` or `TeamsPage.tsx` themselves.
