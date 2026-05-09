# Plan: Redesign `AdvancedFilter` as a Modern Hybrid Modal

## Context

The existing `apps/dashboard/src/components/AdvancedFilter/AdvancedFilterDrawer.tsx` is a right-side drawer that asks users to pick **field → operator → value** for every condition, and only a single consumer (`LoadManagementTable`) uses it. The UX is heavy: even a trivial "filter by status" requires three dropdown interactions, and there is no preview of currently-active filters anywhere on the page.

We want to redesign it as a clean, modern **modal** that:
- Defaults to a **declarative per-field** UX (one labeled control per field — search, select, date range, etc.) for the common case (matches the reference screenshot).
- Still supports **rule-based advanced search** (field+operator+value, AND/OR) in a collapsible section underneath, so power users keep the current flexibility ("operational search").
- Shows applied filters as **removable chips above the table** so users see and clear individual filters without reopening the modal.
- Migrates the only consumer (`LoadManagementTable`) in the same change.

User-confirmed design choices:
- **Hybrid pattern** — declarative quick-filter section on top, collapsible rule-based section below.
- **Match-mode toggle (AND/OR)** kept as a small segmented control at the top.
- **Active filter chips** rendered above the table after Apply.
- **Loads is migrated in this PR.**

The backend wire format (`AdvancedFilter` Zod schema in `packages/core/src/shared/advanced-filter-schema.ts`) does not need to change — the new declarative UI translates each field into the same `{ matchMode, rules[], dateField?, dateFrom?, dateTo? }` shape that `buildLoadAdvancedFilterClause` already consumes. We only add an `in` operator on the backend to support `multiSelect`.

## Critical files

### New files
| Path | Purpose |
|---|---|
| `apps/dashboard/src/components/AdvancedFilter/AdvancedFilterModal.tsx` | The new modal (replaces the drawer). |
| `apps/dashboard/src/components/AdvancedFilter/ActiveFilterChips.tsx` | Chip row shown above the table when a filter is active; supports removing individual filters. |
| `apps/dashboard/src/components/AdvancedFilter/quickFilterTransform.ts` | Pure helpers: `quickValuesToRules(quickValues, quickFields)` and `splitFilterIntoQuickAndRules(filter, quickFields)` — bidirectional translation between the declarative form state and the wire-format `AdvancedFilter`. |

### Modified files
| Path | Change |
|---|---|
| `apps/dashboard/src/components/AdvancedFilter/types.ts` | Add `QuickFilterFieldType` (`"search" \| "select" \| "multiSelect" \| "dateRange" \| "numberRange"`), `QuickFilterField` interface, and `MULTISELECT_OPERATORS` (or just append `{ label: "is one of", value: "in" }` to `ENUM_OPERATORS`). Keep all existing exports. |
| `apps/dashboard/src/components/AdvancedFilter/index.ts` | Re-export `AdvancedFilterModal`, `ActiveFilterChips`, `QuickFilterField`, `QuickFilterFieldType`. Remove the `AdvancedFilterDrawer` re-export (file is deleted). |
| `apps/dashboard/src/components/AdvancedFilter/AdvancedFilterDrawer.tsx` | **Delete** after migration — its responsibilities are covered by `AdvancedFilterModal`. |
| `apps/dashboard/src/features/load/components/LoadManagementTable.tsx` | Replace `AdvancedFilterDrawer` with `AdvancedFilterModal` + `ActiveFilterChips`. Pass new `LOAD_QUICK_FILTER_FIELDS` plus the existing `LOAD_FILTER_FIELDS` (rule-based) to the modal. |
| `apps/dashboard/src/features/load/constants/loadAdvancedFilterFields.ts` | Add a new `LOAD_QUICK_FILTER_FIELDS: QuickFilterField[]` export with: `referenceNumber` (search), `customer` (search), `status` (select with `loadStatusValues`), `dateRange` (mapped to `createdAt`). Keep existing `LOAD_FILTER_FIELDS` (rule-based) untouched. |
| `packages/core/src/shared/load-advanced-filter.ts` | Add `in` operator handling for the existing text/enum fields (`status`, etc.) using Drizzle's `inArray(...)`. Value is comma-separated; split on apply: `value.split(",").map((s) => s.trim()).filter(Boolean)`. |

## Component shape

```ts
// types.ts (additions)
export type QuickFilterFieldType =
  | "search"
  | "select"
  | "multiSelect"
  | "dateRange"
  | "numberRange";

export interface QuickFilterField {
  key: string;                     // backend column name (or the dateField key for dateRange)
  label: string;
  type: QuickFilterFieldType;
  options?: FieldOption[];         // select / multiSelect
  placeholder?: string;
}

// AdvancedFilterModal.tsx
interface Props {
  open: boolean;
  title?: string;                  // default: "Filter"
  quickFields: QuickFilterField[]; // declarative section
  ruleFields: FieldConfig[];       // rule-based section (collapsible)
  initialFilter?: AdvancedFilter;
  onApply: (filter: AdvancedFilter | undefined) => void;
  onClose: () => void;
}
```

## Modal layout (top → bottom)

1. **Header** — `Filter` title.
2. **Match-mode segmented control** — `[Match all]` / `[Match any]` (AntD `Segmented`). Defaults to `all`.
3. **Quick filter sections**, one per `QuickFilterField`:
   - Section header row: `<label>` left, `Reset` link button right (clears just that field).
   - Control:
     - `search` → `<Input.Search prefix={<SearchOutlined/>} />`
     - `select` → `<Select allowClear options={field.options} />`
     - `multiSelect` → `<Select mode="multiple" allowClear options={field.options} />`
     - `dateRange` → `<DatePicker.RangePicker />`
     - `numberRange` → `<Space.Compact><InputNumber placeholder="Min"/><InputNumber placeholder="Max"/></Space.Compact>`
4. **Collapsible "Advanced rules" panel** (`Collapse`) — wraps the existing rule-list UI from the old drawer (field + operator + value, add/remove). Header shows `Advanced rules (<count>)`.
5. **Footer** — `Reset all` (text button, danger, left) · `Cancel` · `Apply now` (primary, right).

## State & translation

Inside `AdvancedFilterModal`:
```ts
const [matchMode, setMatchMode] = useState<"all" | "any">(initial.matchMode ?? "all");
const [quickValues, setQuickValues] = useState<Record<string, unknown>>({});
const [rules, setRules] = useState<FilterRule[]>([]);
const [advancedOpen, setAdvancedOpen] = useState(false);
```

On open: `splitFilterIntoQuickAndRules(initialFilter, quickFields)` populates `quickValues` (for fields whose key matches a known quick field, including the date-range field) and `rules` (everything else).

On Apply: `quickValuesToRules(quickValues, quickFields)` returns `{ rules: FilterRule[], dateField?, dateFrom?, dateTo? }`. Concatenate with the explicit `rules` from the advanced section, attach `matchMode`, emit via `onApply`. If the result has zero rules and no date range, emit `undefined` so the table reverts to default search.

Translation rules:
| Quick type | Rule emitted |
|---|---|
| `search` (value `"abc"`) | `{ field, operator: "contains", value: "abc" }` |
| `select` (value `"x"`) | `{ field, operator: "is", value: "x" }` |
| `multiSelect` (`["a","b"]`) | `{ field, operator: "in", value: "a,b" }` |
| `dateRange` (`[from,to]`) | sets top-level `dateField=key, dateFrom=from, dateTo=to` (no rule pushed) |
| `numberRange` (`[10,50]`) | two rules: `{operator: "gte", value: "10"}` and `{operator: "lte", value: "50"}` |

## ActiveFilterChips

```ts
interface ActiveFilterChipsProps {
  filter: AdvancedFilter | undefined;
  quickFields: QuickFilterField[];
  ruleFields: FieldConfig[];
  onChange: (next: AdvancedFilter | undefined) => void;
}
```
- Renders an `<Tag closable>` per active filter (looks up labels from `quickFields`/`ruleFields` so chips show `Status: Pending` instead of raw keys).
- `onClose` removes that filter from `filter` and calls `onChange(next)`.
- Renders `Clear all` text button at the end.
- Returns `null` when there is nothing to show — call site keeps a single line of code.

## Integration in `LoadManagementTable`

```tsx
import { AdvancedFilterModal, ActiveFilterChips } from "@/components/AdvancedFilter";
import {
  LOAD_FILTER_FIELDS,
  LOAD_QUICK_FILTER_FIELDS,
} from "@/features/load/constants/loadAdvancedFilterFields";

// modal:
<AdvancedFilterModal
  open={modalOpen}
  quickFields={LOAD_QUICK_FILTER_FIELDS}
  ruleFields={LOAD_FILTER_FIELDS}
  initialFilter={activeFilter}
  onApply={(f) => { setActiveFilter(f); setModalOpen(false); }}
  onClose={() => setModalOpen(false)}
/>

// chip row, between header and table:
<ActiveFilterChips
  filter={activeFilter}
  quickFields={LOAD_QUICK_FILTER_FIELDS}
  ruleFields={LOAD_FILTER_FIELDS}
  onChange={setActiveFilter}
/>
```

The existing search-input disabling logic (`isFilterActive ? undefined : searchText`) and `refreshDeps: [searchText, activeFilter]` are kept exactly.

## Reused utilities (do not re-implement)

- **`buildLoadAdvancedFilterClause`** in `packages/core/src/shared/load-advanced-filter.ts` — already supports rules + date range + matchMode. Only the `in` operator is added.
- **`buildAdvancedFilterSql`** in `packages/core/src/shared/advanced-filter-sql.ts` — generic SQL combiner; no changes.
- **`AdvancedFilter` Zod schema** in `packages/core/src/shared/advanced-filter-schema.ts` — already exposes `dateField/dateFrom/dateTo` and `matchMode`; no changes.
- **`useAntdTable`, `useDebounce`, `useRequest`** (ahooks) — already used in `LoadManagementTable`.
- **`getErrorMessage`** in `@/utils/errorUtils`.

## Verification

End-to-end checks (run before merging):

1. **Type & lint gate:**
   ```
   pnpm exec biome ci .
   pnpm turbo run build
   pnpm turbo run test
   ```
2. **Manual UI flow on `/loads`** (`pnpm run:dashboard`, dev backend):
   - Open Filter modal → renders all quick fields + collapsed advanced panel.
   - Apply only `Status = Pending` → chip `Status: Pending` shows above table; URL doesn't crash; backend returns matching rows.
   - Apply `Date range = last 7 days` → chip shows; rows filtered.
   - Apply `Status in [Pending, Approved]` (multiSelect) → backend `in` clause returns union; chip shows `Status: Pending, Approved`.
   - Add an Advanced rule (`carrierRate > 1000`), Apply → both quick + rule active; two chips; both filters AND-ed.
   - Toggle Match mode to `any` → re-applies with OR; verify result count changes.
   - Click chip × → that filter is removed without reopening modal; table refreshes.
   - "Reset all" inside modal clears every section.
3. **Backend smoke:** verify in dev that an `in` operator on `status` works (`pnpm sst shell --stage dev` then curl `GET /api/loads?filters=...`). No DB migration needed.
4. **No regressions:** Loads search box still works when no filter is active; sorting & pagination unchanged.

## Out of scope

- Adding filters to Payment Orders or any other page (separate change).
- Persisting filter state in the URL (separate change — currently in-memory).
- Removing `AdvancedFilterDrawer` references outside the load module (none exist today; verified by `Explore`).
