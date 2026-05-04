# User Management Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the separate "Users" and "Teams" sidebar entries into a single "User Management" item at `/user-management`, with an Ant Design `<Tabs>` component that hides the tab bar when the user only holds one of the two permissions.

**Architecture:** A new `UserManagementPage` composes the existing `UserManagementTable`/`TeamManagementTable` components (and their modal providers) directly. It reads `permissions.users.view` and `permissions.teams.view` from `useCurrentUser()` and renders either a tabbed layout or a single table. The sidebar item is shown if *either* resource has a `view` permission — the existing `Array.some` filter already handles this. No backend changes.

**Tech Stack:** React 19, Ant Design 6 (`Tabs`), React Router DOM 7 (`useSearchParams`, `Navigate`), `useCurrentUser` hook, Vitest + Testing Library.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/dashboard/src/features/user/pages/UserManagementPage.tsx` | **Create** | Permission-aware page: tabs when both, single table otherwise |
| `apps/dashboard/src/features/user/pages/UserManagementPage.test.tsx` | **Create** | Vitest tests for permission branching logic |
| `apps/dashboard/src/layouts/Sidebar.tsx` | **Edit** | Replace two items with one "User Management" entry |
| `apps/dashboard/src/routes/router.tsx` | **Edit** | Add `/user-management` route, redirect `/` and remove `/teams` |

---

## Task 1: Create `UserManagementPage`

**Files:**
- Create: `apps/dashboard/src/features/user/pages/UserManagementPage.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Tabs } from "antd";
import type React from "react";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import TeamManagementTable from "@/features/team/components/TeamManagementTable";
import { TeamModalProvider } from "@/features/team/providers/TeamModalProvider";
import UserManagementTable from "@/features/user/components/UserManagementTable";
import { UserModalProvider } from "@/features/user/providers/UserModalProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const UserManagementPage: React.FC = () => {
  const { permissions } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewUsers = permissions.users?.view ?? false;
  const canViewTeams = permissions.teams?.view ?? false;
  const showTabs = canViewUsers && canViewTeams;
  const activeTab = searchParams.get("tab") ?? "users";

  const handleTabChange = useCallback(
    (key: string) => {
      setSearchParams({ tab: key });
    },
    [setSearchParams],
  );

  if (showTabs) {
    return (
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: "users",
            label: "Users",
            children: (
              <UserModalProvider>
                <UserManagementTable />
              </UserModalProvider>
            ),
          },
          {
            key: "teams",
            label: "Teams",
            children: (
              <TeamModalProvider>
                <TeamManagementTable />
              </TeamModalProvider>
            ),
          },
        ]}
      />
    );
  }

  if (canViewTeams) {
    return (
      <TeamModalProvider>
        <TeamManagementTable />
      </TeamModalProvider>
    );
  }

  return (
    <UserModalProvider>
      <UserManagementTable />
    </UserModalProvider>
  );
};

export default UserManagementPage;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/features/user/pages/UserManagementPage.tsx
git commit -m "feat(ui): add UserManagementPage with permission-aware tabs"
```

---

## Task 2: Test `UserManagementPage` permission branching

**Files:**
- Create: `apps/dashboard/src/features/user/pages/UserManagementPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import type React from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import UserManagementPage from "./UserManagementPage";

vi.mock("@/hooks/useCurrentUser");
vi.mock("@/features/user/components/UserManagementTable", () => ({
  default: () => <div>UserManagementTable</div>,
}));
vi.mock("@/features/team/components/TeamManagementTable", () => ({
  default: () => <div>TeamManagementTable</div>,
}));
vi.mock("@/features/user/providers/UserModalProvider", () => ({
  UserModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/team/providers/TeamModalProvider", () => ({
  TeamModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makePermissions = (usersView: boolean, teamsView: boolean) => ({
  users: { view: usersView, edit: false, add: false },
  teams: { view: teamsView, edit: false, add: false },
  branches: { view: false, edit: false, add: false },
  loads: { view: false, edit: false, add: false },
  brokers: { view: false, edit: false, add: false },
  brokers_requests: { view: false, edit: false, add: false },
  carriers_twy: { view: false, edit: false, add: false },
  carriers_outside: { view: false, edit: false, add: false },
  carriers_requests: { view: false, edit: false, add: false },
});

const renderPage = (usersView: boolean, teamsView: boolean) => {
  vi.mocked(useCurrentUser).mockReturnValue({
    permissions: makePermissions(usersView, teamsView),
    authMe: null,
    loading: false,
  } as unknown as ReturnType<typeof useCurrentUser>);
  return render(
    <MemoryRouter>
      <UserManagementPage />
    </MemoryRouter>,
  );
};

describe("UserManagementPage", () => {
  it("shows Users and Teams tabs when both permissions are granted", () => {
    renderPage(true, true);
    expect(screen.getByRole("tab", { name: "Users" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Teams" })).toBeDefined();
  });

  it("renders UserManagementTable directly without tabs when only users.view", () => {
    renderPage(true, false);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("UserManagementTable")).toBeDefined();
  });

  it("renders TeamManagementTable directly without tabs when only teams.view", () => {
    renderPage(false, true);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("TeamManagementTable")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (UserManagementPage import path)**

```bash
pnpm --filter @twy/dashboard exec vitest run src/features/user/pages/UserManagementPage.test.tsx
```

Expected: tests fail with import or render errors (the mocks need the real module to exist — Task 1 must be committed first). If Task 1 is done and tests still fail, check the mock signatures match the actual component props.

- [ ] **Step 3: Run tests — expect PASS**

After confirming the mocks align, re-run:

```bash
pnpm --filter @twy/dashboard exec vitest run src/features/user/pages/UserManagementPage.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/features/user/pages/UserManagementPage.test.tsx
git commit -m "test(ui): add UserManagementPage permission branching tests"
```

---

## Task 3: Update `Sidebar.tsx`

**Files:**
- Modify: `apps/dashboard/src/layouts/Sidebar.tsx`

Current state (lines 1–7 imports, line 48 Users item, line 63 Teams item):

```ts
// imports include:
import { BranchesOutlined, CarOutlined, LineChartOutlined, TeamOutlined, TruckOutlined, UserSwitchOutlined } from "@ant-design/icons";

// allMenuItems contains:
{ key: "/", icon: <LineChartOutlined />, label: "Users", resources: ["users"] },
// ...
{ key: "/teams", icon: <UserSwitchOutlined />, label: "Teams", resources: ["teams"] },
```

- [ ] **Step 1: Replace the import line**

Old:
```ts
import {
  BranchesOutlined,
  CarOutlined,
  LineChartOutlined,
  TeamOutlined,
  TruckOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
```

New (swap `LineChartOutlined` + `UserSwitchOutlined` for `UsergroupAddOutlined`):
```ts
import {
  BranchesOutlined,
  CarOutlined,
  TeamOutlined,
  TruckOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
```

- [ ] **Step 2: Replace the Users item and remove the Teams item in `allMenuItems`**

Old:
```ts
{ key: "/", icon: <LineChartOutlined />, label: "Users", resources: ["users"] },
{ key: "/branches", icon: <BranchesOutlined />, label: "Branches", resources: ["branches"] },
{ key: "/loads", icon: <TruckOutlined />, label: "Loads", resources: ["loads"] },
{
  key: "/outside-brokers",
  icon: <TeamOutlined />,
  label: "Outside Brokers",
  resources: ["brokers", "brokers_requests"],
},
{
  key: "/carriers",
  icon: <CarOutlined />,
  label: "Carriers",
  resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
},
{ key: "/teams", icon: <UserSwitchOutlined />, label: "Teams", resources: ["teams"] },
```

New:
```ts
{
  key: "/user-management",
  icon: <UsergroupAddOutlined />,
  label: "User Management",
  resources: ["users", "teams"],
},
{ key: "/branches", icon: <BranchesOutlined />, label: "Branches", resources: ["branches"] },
{ key: "/loads", icon: <TruckOutlined />, label: "Loads", resources: ["loads"] },
{
  key: "/outside-brokers",
  icon: <TeamOutlined />,
  label: "Outside Brokers",
  resources: ["brokers", "brokers_requests"],
},
{
  key: "/carriers",
  icon: <CarOutlined />,
  label: "Carriers",
  resources: ["carriers_twy", "carriers_outside", "carriers_requests"],
},
```

The existing `filteredItems` filter (`item.resources.some(r => permissions[r]?.view)`) already handles OR semantics — no other changes needed.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/layouts/Sidebar.tsx
git commit -m "feat(ui): merge Users and Teams sidebar items into User Management"
```

---

## Task 4: Update `router.tsx`

**Files:**
- Modify: `apps/dashboard/src/routes/router.tsx`

- [ ] **Step 1: Swap out the old imports**

Remove:
```ts
import TeamsPage from "@/features/team/pages/TeamsPage";
import UsersPage from "@/features/user/pages/UsersPage";
```

Add:
```ts
import UserManagementPage from "@/features/user/pages/UserManagementPage";
```

- [ ] **Step 2: Replace the index route with a redirect**

Old (lines 43–50):
```tsx
{
  index: true,
  element: (
    <RequirePermission resource="users" action="view">
      <UsersPage />
    </RequirePermission>
  ),
},
```

New:
```tsx
{ index: true, element: <Navigate to="/user-management" replace /> },
{
  path: "user-management",
  element: <UserManagementPage />,
},
```

- [ ] **Step 3: Remove the `/teams` route**

Old (lines 130–137):
```tsx
{
  path: "teams",
  element: (
    <RequirePermission resource="teams" action="view">
      <TeamsPage />
    </RequirePermission>
  ),
},
```

Delete that block entirely.

- [ ] **Step 4: Update the `/home` catch-all redirect at the bottom**

Old:
```ts
{ path: "/home", element: <Navigate to="/" replace /> },
```

New:
```ts
{ path: "/home", element: <Navigate to="/user-management" replace /> },
```

- [ ] **Step 5: Verify TypeScript compiles and lint passes**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit
pnpm check:ci
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/routes/router.tsx
git commit -m "feat(ui): route /user-management, redirect / and /teams"
```

---

## Task 5: Smoke test in the browser

- [ ] **Step 1: Start the dev server**

```bash
pnpm run:dashboard
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Check all four permission combinations visually**

Log in with an account that has both `users.view` and `teams.view`:
- Sidebar shows "User Management" (not separate "Users" / "Teams").
- Navigating to `/user-management` shows two tabs: **Users** and **Teams**.
- Clicking Teams tab changes URL to `/user-management?tab=teams` and renders the teams table.
- Clicking Users tab changes URL to `/user-management?tab=users` (or removes the param) and renders the users table.
- Navigating to `/` redirects to `/user-management`.
- Navigating to `/teams` shows a 404 (Not Found) — expected since the route is removed.

Log in with an account that only has `users.view` (no `teams.view`):
- Sidebar still shows "User Management".
- `/user-management` renders the users table with **no tab bar**.

Log in with an account that only has `teams.view`:
- `/user-management` renders the teams table with **no tab bar**.

- [ ] **Step 3: Run full verification gate**

```bash
pnpm check:ci && pnpm turbo run build --filter @twy/dashboard && pnpm turbo run test --filter @twy/dashboard
```

Expected: all pass.
