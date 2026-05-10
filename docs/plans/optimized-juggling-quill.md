# AdvancedFilter redesign — flat per-page filters with built-in keyword search

## Context

The `AdvancedFilter` component currently exposes two parallel UIs: declarative
"quick fields" (per-page list of typed filters) and a generic "advanced rules"
builder (`field` + `operator` + `value` + AND/OR `matchMode`). After the recent
React 19 cleanup, only the quick fields are actually used in practice — the rule
builder is bulky, duplicated across 9 consumer pages, and most teams just want a
short list of well-chosen filters per screen.

In addition, every list page today renders an `<Input.Search>` *outside* the
filter popover that hits the backend `query` URL param. The user wants this
keyword input folded into the popover too, so each page has exactly one filter
surface.

The redesign: delete the rule builder entirely, make `quickFields` per page the
only source of truth for strict-data filters (status `select`, date ranges,
etc.), and bake a single always-on "Keyword" text field into the popover that
maps to the existing `query` API param. Free-text column search goes away —
text search is now the single keyword box. The wire format stays compatible
(`{ matchMode: "all", rules, dateField, dateFrom, dateTo }`) so backend changes
are minimal.

## Scope

### Component package — `apps/dashboard/src/components/AdvancedFilter/`

**Delete:**
- `AdvancedRulesSection.tsx`
- `RuleRow.tsx`
- `FieldConfig` type, `FilterRule.operator` editor types, `validRuleCount`
- The `matchMode` selector and state (always emit `"all"`)

**Keep / modify:**
- `AdvancedFilterPopover.tsx` — drop `ruleFields` prop; add internal
  always-rendered "Keyword search" text input above the quick fields; remove
  `matchMode` state; emit `query?: string` alongside the filter on apply.
- `QuickFilterControl.tsx` — drop `search` field type (no per-column text
  search anymore). Supported types after redesign: `select`, `multiSelect`,
  `dateRange`, `numberRange`.
- `QuickFilterSection.tsx` — unchanged structurally; just renders the reduced
  field types.
- `ActiveFilterChips.tsx` — render a "Keyword: foo" chip when the keyword is
  set; remove all rule-id-based chip logic for non-quick fields.
- `quickFilterTransform.ts` — remove the `extraRules` param from
  `quickValuesToFilter` and `splitFilterToQuickValues` return; hardcode
  `matchMode: "all"`; carry the keyword through as a sibling state (NOT a rule).
- `types.ts` — drop `FieldConfig`, `FilterRule.operator` enum constraints; trim
  `QuickFilterFieldType` to `"select" | "multiSelect" | "dateRange" | "numberRange"`;
  drop the `fieldHasValue` branch for `"search"`.
- `index.ts` — drop `FieldConfig` export.

### State shape

`AdvancedFilter` (the JSON sent to the backend) stays identical so the existing
Zod schema in `packages/core/src/shared/advanced-filter-schema.ts` still parses.

The orchestrator (`AdvancedFilterPopover`) tracks **two** local state slots:
- `query: string` (the keyword)
- `quickValues: QuickValues` (the strict-data fields)

`onApply` callback signature changes to:
```ts
onApply: (filter: AdvancedFilter | undefined, query: string | undefined) => void
```
Each consumer wires `query` to the API call's `query` param (already supported
on every list endpoint), and `filter` to `filters: JSON.stringify(filter)`.

The "is anything active" badge flips on if `query` OR `filter` is set.
`ActiveFilterChips` renders a "Keyword: foo" chip alongside the rule chips and
calls a new `onClearQuery` handler when removed.

### Per-page consumer changes

Every page loses its `*_FILTER_FIELDS` rule array, its external `<Input.Search>`,
and (where applicable) its external status `<Select>`. The default
`statusFilter: "pending"` behavior on `CarrierRequestsTab` and `BrokerRequestsTab`
goes away — they show all by default after the redesign.

Files to update with their new `quickFields`:

| File | New quickFields |
|---|---|
| `features/branch/components/BranchManagementTable.tsx` | _(none — keyword only)_ |
| `features/user/components/UserManagementTable.tsx` | `isActive` (select Yes/No) |
| `features/team/components/TeamManagementTable.tsx` | `branchRestricted` (select Yes/No), `onlyOwnData` (select Yes/No) |
| `features/load/components/LoadManagementTable.tsx` | `status` (select 5 enum), `createdAt` (dateRange) |
| `features/carrier/components/CarrierTable.tsx` | `status` (select Approved/Denied), `insuranceStatus` (select Valid/Expired/Pending) |
| `features/outside-broker/components/OutsideBrokersManagementTable.tsx` | `status` (select), `creditLimitUnlimited` (select Yes/No), `creditLimit` (numberRange) |
| `features/carrier/pages/CarrierRequestsTab.tsx` | `kind` (select Twy/Outside), `status` (select pending/approved/rejected), `insuranceStatus` (select) |
| `features/outside-broker/pages/BrokerRequestsTab.tsx` | `status` (select pending/approved/rejected), `creditLimitUnlimited` (select Yes/No), `creditLimit` (numberRange) |
| `features/accounting/pages/PaymentOrdersPage.tsx` | `branchId` (select, populated from `getBranches`) |

Each page also drops:
- `searchInput` / `searchText` / `useDebounce` imports
- The `<Input.Search>` JSX
- The `<Tooltip>`+`disabled`+opacity dance for "filter active disables search"
- The `<Badge>` rule-count math (popover handles its own active indicator)
- For Loads / PaymentOrders: re-use the existing `<ActiveFilterChips>` block; add
  it to the other 7 pages too for consistency (was missing before).

### Backend — normalize PaymentOrders

`packages/functions/src/api/payment-order/list.ts` currently accepts only
`page/limit/branchId`. To match the redesigned frontend (which emits filters as
`{ rules: [{field:"branchId", operator:"is", value:"…"}] }`):

1. Add `filtersQueryParamSchema` (`parseOptionalFiltersJson`) and a `query`
   string param to the request schema.
2. In the payment-order repository, add a `buildPaymentOrderRuleCondition`
   switch that maps `field === "branchId"` + `operator === "is"` to an `eq`
   predicate, then run it through the existing
   `buildAdvancedFilterSql` helper from
   `packages/core/src/shared/advanced-filter-sql.ts`.
3. Drop the standalone `branchId` query param from the request schema.

Frontend `PaymentOrdersPage.tsx` then stops doing
`activeFilter?.rules.find(r => r.field === "branchId")?.value` and just sends
`filters: JSON.stringify(activeFilter)` like every other page.

## Files to modify

### Component package (delete + rewrite)
- `apps/dashboard/src/components/AdvancedFilter/types.ts` — trim types
- `apps/dashboard/src/components/AdvancedFilter/index.ts` — drop `FieldConfig`
- `apps/dashboard/src/components/AdvancedFilter/AdvancedFilterPopover.tsx` — major rewrite
- `apps/dashboard/src/components/AdvancedFilter/QuickFilterControl.tsx` — drop `search` branch
- `apps/dashboard/src/components/AdvancedFilter/QuickFilterSection.tsx` — minor
- `apps/dashboard/src/components/AdvancedFilter/ActiveFilterChips.tsx` — keyword chip
- `apps/dashboard/src/components/AdvancedFilter/quickFilterTransform.ts` — drop `extraRules`
- **Delete:** `AdvancedRulesSection.tsx`, `RuleRow.tsx`

### Consumer pages (9 files)
All simplified; field arrays replaced or dropped per the table above.

### Backend
- `packages/functions/src/api/payment-order/list.ts` — accept `filters`/`query`, drop `branchId`
- `packages/functions/src/api/payment-order/list-schema.ts` (or wherever request schema lives) — same
- `packages/functions/src/repository/paymentOrderRepository.ts` (or equivalent) — wire `buildAdvancedFilterSql`
- `apps/dashboard/src/features/accounting/api/paymentOrderApi.ts` — drop `branchId` arg, add `query`/`filters`

## Reuse — already present, do not re-create

- `parseOptionalFiltersJson` / `filtersQueryParamSchema` in `packages/core/src/shared/advanced-filter-schema.ts`
- `buildAdvancedFilterSql` in `packages/core/src/shared/advanced-filter-sql.ts`
- `quickValuesToFilter` / `splitFilterToQuickValues` (keep, modify signature)
- `ActiveFilterChips` (extend to render keyword chip)

## Verification

1. `pnpm exec biome ci apps/dashboard/src/components/AdvancedFilter/ apps/dashboard/src/features/ packages/functions/src/api/payment-order/`
2. `pnpm turbo run build` — TypeScript check across the workspace.
3. `pnpm --filter @twy/dashboard exec vitest run` if any related tests exist.
4. Manual smoke in `pnpm sst dev`:
   - Visit Branches: type "smith" in keyword → list narrows; clear → restored.
   - Visit Loads: pick `status = Approved` + date range → results filter; chip shows; "Clear all" works.
   - Visit CarrierRequests: page now opens showing all statuses (no longer
     pending-only by default). Pick `status = pending` from popover → behaves
     as before.
   - Visit PaymentOrders: select branch → URL request now uses `filters` JSON,
     not `branchId`; verify backend response unchanged.
5. Open dev tools Network tab and confirm: no list endpoint receives
   `matchMode: "any"` anymore; PaymentOrders list call carries `filters` not `branchId`.

## Out of scope

- Server-side stricter Zod validation of `field`/`operator` enums (could be a follow-up).
- Saved-views / URL-encoded filter state (no consumer needs it today).
- New filter types (text-with-operator, between, etc.) — drop and revisit only if a page asks.
