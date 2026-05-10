# TeamMembersSection Refactor Design

**Date:** 2026-05-10  
**Scope:** `apps/dashboard/src/features/team/components/`  
**Goal:** Split `TeamMembersSection.tsx` into two focused components, apply React 19 primitives, fix all Biome violations, and adopt AntD v6 API correctly.

---

## Component Split

### `TeamMembersSection.tsx`
Owns: member list, pagination, remove action.

Renders:
- Header row: "Members" label + count `<Tag>`, "Add member" button (hidden when picker is open)
- `<AddMemberPicker>` (mounted when add button clicked)
- `<Table>` of current members

Props received: `{ teamId: string }`

### `AddMemberPicker.tsx`
Owns: unassigned user search, infinite scroll, selection, add action.

Props received:
```ts
interface AddMemberPickerProps {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}
```

Fully self-contained. Calls `onAdded()` after a successful add so the parent refetches.

---

## State & React 19 Patterns

### `TeamMembersSection`

| State | Type | Notes |
|---|---|---|
| `members` | `TeamMember[]` | Raw list from API |
| `total` | `number` | For pagination |
| `loadingMembers` | `boolean` | Table loading state |
| `page` | `number` | 0-indexed current page |

- `useOptimistic(members, reducer)` — remove action applies optimistic update immediately; rolls back on API error
- `useTransition` — wraps pagination `onChange` so page change is non-urgent
- `fetchMembers` wrapped in `useCallback([teamId])`
- `handleRemove` wrapped in `useCallback([members, page, teamId, fetchMembers])`

### `AddMemberPicker`

Unassigned picker state grouped into one object:
```ts
const [picker, setPicker] = useState<{
  items: TeamMember[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  search: string;
}>({ items: [], loading: false, page: 0, hasMore: true, search: "" });
```

- `selectedUserId: string | undefined` stays separate (distinct concern)
- `adding: boolean` stays separate
- `useDebounceFn` from `ahooks` replaces `searchTimeoutRef` + manual `setTimeout`
- `fetchUnassigned` wrapped in `useCallback`
- `handleAdd`, `handleScroll`, `handleSearch` all wrapped in `useCallback`
- `useEffect([fetchUnassigned])` triggers initial load on mount

---

## AntD v6 API

### Select (in `AddMemberPicker`)
```tsx
<Select
  showSearch
  filterOption={false}
  onSearch={handleSearch}
  onPopupScroll={handleScroll}
  loading={picker.loading}
  value={selectedUserId}
  onChange={setSelectedUserId}
  style={{ flex: 1 }}
  options={...}
  optionRender={...}
/>
```
- `showSearch` is a boolean in AntD v6, not an object
- `filterOption={false}` and `onSearch` are top-level props

### Table (in `TeamMembersSection`)
- `dataSource` receives the optimistic list (from `useOptimistic`)
- `columns` typed as `ColumnsType<TeamMember>` — no `any`
- `size="small"`, pagination config unchanged

---

## Files Changed

| File | Action |
|---|---|
| `TeamMembersSection.tsx` | Rewrite — strip picker state, add `useOptimistic` + `useTransition` |
| `AddMemberPicker.tsx` | Create — extract picker logic with grouped state + `useDebounceFn` |

No new routes, no API changes, no schema changes.
