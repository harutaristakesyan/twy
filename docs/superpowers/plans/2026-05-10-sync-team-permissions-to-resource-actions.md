# Sync Team Permissions to Resource Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove non-existent actions from the team permission matrix and fix billing backend handlers that check the wrong resource.

**Architecture:** Add a `RESOURCE_ACTIONS` map to `permissions.ts` that declares exactly which actions each resource supports, update `PermissionMatrixField` to render `—` for non-applicable cells, and fix 4 billing Lambda handlers that incorrectly assert `payment_orders` view instead of `external_billing`/`internal_billing` view.

**Tech Stack:** TypeScript, React 19, Ant Design 6, Middy Lambda handlers.

---

## Files Modified

| File | Change |
|---|---|
| `apps/dashboard/src/utils/permissions.ts` | Add `RESOURCE_ACTIONS` export |
| `apps/dashboard/src/features/team/components/PermissionMatrixField.tsx` | Use `RESOURCE_ACTIONS` to render `—` for N/A cells; fix row/column toggle logic |
| `packages/functions/src/api/billing/external-by-branch.ts` | `assertPermission(ctx, "external_billing", "view")` |
| `packages/functions/src/api/billing/external-loads.ts` | `assertPermission(ctx, "external_billing", "view")` |
| `packages/functions/src/api/billing/internal-by-branch.ts` | `assertPermission(ctx, "internal_billing", "view")` |
| `packages/functions/src/api/billing/internal-loads.ts` | `assertPermission(ctx, "internal_billing", "view")` |

---

### Task 1: Add `RESOURCE_ACTIONS` to permissions.ts

**Files:**
- Modify: `apps/dashboard/src/utils/permissions.ts`

- [ ] **Step 1: Add the RESOURCE_ACTIONS constant**

Open `apps/dashboard/src/utils/permissions.ts`. After the `ACTIONS` line (line 15), add:

```ts
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  branches: ["add", "view", "edit"],
  brokers: ["add", "view", "edit"],
  brokers_requests: ["view", "edit"],
  carriers_twy: ["add", "view", "edit"],
  carriers_outside: ["add", "view", "edit"],
  carriers_requests: ["view", "edit"],
  teams: ["add", "view", "edit"],
  users: ["add", "view", "edit"],
  loads: ["add", "view", "edit"],
  payment_orders: ["view", "edit"],
  external_billing: ["view"],
  internal_billing: ["view"],
};
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/utils/permissions.ts
git commit -m "feat(team): add RESOURCE_ACTIONS map to permissions"
```

---

### Task 2: Update PermissionMatrixField to respect RESOURCE_ACTIONS

**Files:**
- Modify: `apps/dashboard/src/features/team/components/PermissionMatrixField.tsx`

The matrix has resources as rows and Add/View/Edit as columns. For cells where an action is not in `RESOURCE_ACTIONS[resource]`, render a centered `—` instead of a checkbox. The row toggle and column toggle logic must also be updated to skip non-applicable actions.

- [ ] **Step 1: Import RESOURCE_ACTIONS and update the import line**

Change the existing import from `@/utils/permissions` (around line 5–11) to also pull in `RESOURCE_ACTIONS`:

```ts
import {
  ACTIONS,
  type Action,
  type PermissionsMap,
  RESOURCE_ACTIONS,
  RESOURCES,
  type Resource,
} from "@/utils/permissions";
```

- [ ] **Step 2: Fix handleRowToggle to only toggle valid actions**

Replace the `handleRowToggle` callback (lines 87–96) with:

```ts
const handleRowToggle = useCallback(
  (resource: Resource, checked: boolean) => {
    if (!value || !onChange) return;
    const validActions = RESOURCE_ACTIONS[resource];
    const updated = { ...value[resource] };
    for (const a of validActions) {
      updated[a] = checked;
    }
    // cascade: if unchecking, clear dependents; if checking, ensure prerequisites
    const final = validActions.reduce(
      (acc, a) => cascade(a, checked, acc),
      updated as Record<Action, boolean>,
    );
    onChange({ ...value, [resource]: final });
  },
  [value, onChange],
);
```

- [ ] **Step 3: Fix handleColumnToggle to only affect resources that support the action**

Replace the `handleColumnToggle` callback (lines 98–112) with:

```ts
const handleColumnToggle = useCallback(
  (action: Action, checked: boolean) => {
    if (!value || !onChange) return;
    const updated = { ...value };
    for (const resource of RESOURCES) {
      if (!RESOURCE_ACTIONS[resource].includes(action)) continue;
      updated[resource] = cascade(action, checked, updated[resource] ?? { add: false, view: false, edit: false });
    }
    onChange(updated);
  },
  [value, onChange],
);
```

- [ ] **Step 4: Fix the Resource column "allChecked" / "indeterminate" calculation**

In the `columns` array, the Resource column render function (line 121) currently checks all `ACTIONS`. Update it to check only valid actions for that resource:

```ts
render: (resource: Resource) => {
  const validActions = RESOURCE_ACTIONS[resource];
  const allChecked = value ? validActions.every((a) => value[resource]?.[a]) : false;
  const someChecked = value ? validActions.some((a) => value[resource]?.[a]) : false;
  return (
    <Checkbox
      checked={allChecked}
      indeterminate={someChecked && !allChecked}
      onChange={(e) => handleRowToggle(resource, e.target.checked)}
    >
      <Tag color="blue" style={{ marginLeft: 4 }}>
        {RESOURCE_LABELS[resource]}
      </Tag>
    </Checkbox>
  );
},
```

- [ ] **Step 5: Fix the column header "allChecked" / "indeterminate" to only count applicable resources**

In `...ACTIONS.map((action) => ({ title: () => { ... } }))` (line 136–159), update the column header:

```ts
...ACTIONS.map((action) => ({
  title: () => {
    const applicableResources = RESOURCES.filter((r) => RESOURCE_ACTIONS[r].includes(action));
    const allChecked = value ? applicableResources.every((r) => value[r]?.[action]) : false;
    const someChecked = value ? applicableResources.some((r) => value[r]?.[action]) : false;
    return (
      <Checkbox
        checked={allChecked}
        indeterminate={someChecked && !allChecked}
        onChange={(e) => handleColumnToggle(action, e.target.checked)}
      >
        {ACTION_LABELS[action]}
      </Checkbox>
    );
  },
  dataIndex: action,
  key: action,
  width: 90,
  render: (_: unknown, row: MatrixRow) => {
    if (!RESOURCE_ACTIONS[row.resource].includes(action)) {
      return <span style={{ color: "#bfbfbf", display: "block", textAlign: "center" }}>—</span>;
    }
    return (
      <Checkbox
        checked={value?.[row.resource]?.[action] ?? false}
        onChange={(e) => handleChange(row.resource, action, e.target.checked)}
      />
    );
  },
})),
```

- [ ] **Step 6: Verify types compile**

```bash
pnpm --filter @twy/dashboard exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/features/team/components/PermissionMatrixField.tsx
git commit -m "feat(team): render — for non-applicable actions in permission matrix"
```

---

### Task 3: Fix billing Lambda handlers to check correct resource

**Files:**
- Modify: `packages/functions/src/api/billing/external-by-branch.ts`
- Modify: `packages/functions/src/api/billing/external-loads.ts`
- Modify: `packages/functions/src/api/billing/internal-by-branch.ts`
- Modify: `packages/functions/src/api/billing/internal-loads.ts`

All 4 files currently have `assertPermission(ctx, "payment_orders", "view")`. Change each to assert the correct resource.

- [ ] **Step 1: Fix external-by-branch.ts**

Find the line `assertPermission(ctx, "payment_orders", "view");` and change it to:

```ts
assertPermission(ctx, "external_billing", "view");
```

- [ ] **Step 2: Fix external-loads.ts**

Find the line `assertPermission(ctx, "payment_orders", "view");` and change it to:

```ts
assertPermission(ctx, "external_billing", "view");
```

- [ ] **Step 3: Fix internal-by-branch.ts**

Find the line `assertPermission(ctx, "payment_orders", "view");` and change it to:

```ts
assertPermission(ctx, "internal_billing", "view");
```

- [ ] **Step 4: Fix internal-loads.ts**

Find the line `assertPermission(ctx, "payment_orders", "view");` and change it to:

```ts
assertPermission(ctx, "internal_billing", "view");
```

- [ ] **Step 5: Build functions package to verify**

```bash
pnpm --filter @twy/functions exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/functions/src/api/billing/external-by-branch.ts \
        packages/functions/src/api/billing/external-loads.ts \
        packages/functions/src/api/billing/internal-by-branch.ts \
        packages/functions/src/api/billing/internal-loads.ts
git commit -m "fix(billing): assert correct resource in billing permission checks"
```

---

### Task 4: Full verification

- [ ] **Step 1: Run full verification**

```bash
pnpm check:ci && pnpm build
```

Expected: zero Biome errors, zero build errors.

- [ ] **Step 2: Manual smoke test — open the Teams page**

Navigate to the Teams section, open a team for editing. Confirm:
- `Brokers — Requests` row: Add column shows `—`, View and Edit show checkboxes
- `Carriers — Requests` row: Add column shows `—`, View and Edit show checkboxes
- `Accounting — Payment Orders` row: Add column shows `—`, View and Edit show checkboxes
- `Accounting — External Billing` row: Add and Edit columns show `—`, only View shows a checkbox
- `Accounting — Internal Billing` row: Add and Edit columns show `—`, only View shows a checkbox
- The "Add" column header toggle does NOT flip External Billing or Internal Billing rows
- Checking "Edit" on a row auto-checks "View" but does not touch N/A cells

- [ ] **Step 3: Final commit if any stray changes remain**

```bash
git status
# if clean, nothing to do
```
