# AdvancedFilter — React 19 Refactor Design

**Date:** 2026-05-10  
**Scope:** `apps/dashboard/src/components/AdvancedFilter/`  
**Goal:** Decompose a 450-line monolithic component into focused, properly-typed React 19 components.

---

## Problems being fixed

| File | Issue |
|---|---|
| `AdvancedFilterPopover.tsx` | `renderQuickControl` and `renderRuleValue` are render functions wrapped in `useCallback` — the anti-pattern React 19 replaces with proper components |
| `AdvancedFilterPopover.tsx` | `collapseItems` JSX array rebuilt on every render (no `useMemo`) |
| `AdvancedFilterPopover.tsx` | `validRuleCount` computed inline without `useMemo` |
| `AdvancedFilterPopover.tsx` | `fieldHasValue(val, type: string)` — `type` should be `QuickFilterFieldType` |
| `ActiveFilterChips.tsx` | `buildChips(...)` called in render without `useMemo` |
| Both | Multiple inline style objects created fresh on every render |

---

## New file layout

```
AdvancedFilter/
  types.ts                   ← fix fieldHasValue signature; no other changes
  quickFilterTransform.ts    ← unchanged
  QuickFilterControl.tsx     ← NEW: proper component replacing renderQuickControl
  RuleRow.tsx                ← NEW: single condition row + RuleValueInput inline
  AdvancedRulesSection.tsx   ← NEW: Collapse wrapper + rule list
  AdvancedFilterPopover.tsx  ← thin orchestrator: state + useEffect + layout (~110 lines)
  ActiveFilterChips.tsx      ← memoize chips; extract module-level style
  index.ts                   ← unchanged
```

---

## Component designs

### `QuickFilterControl`

Pure presentational, no local state.

```ts
interface Props {
  field: QuickFilterField;
  value: unknown;
  onChange: (val: unknown) => void;
  onReset: () => void;
}
```

Each `field.type` branch is a switch/if in the return. Parent passes stable `onChange`/`onReset` via `useCallback` so this component never re-renders unnecessarily.

### `RuleRow`

Renders field-select + operator-select + value-input for one rule. Contains `RuleValueInput` logic inline (tight coupling — separate file adds overhead with no benefit).

```ts
interface Props {
  rule: FilterRule;
  ruleFields: FieldConfig[];
  index: number;
  onUpdate: (id: string, patch: Partial<FilterRule>) => void;
  onRemove: (id: string) => void;
}
```

### `AdvancedRulesSection`

Owns the `Collapse` and renders `RuleRow[]`. Memoizes `collapseItems` with `useMemo`.

```ts
interface Props {
  ruleFields: FieldConfig[];
  rules: FilterRule[];
  validRuleCount: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FilterRule>) => void;
}
```

### `AdvancedFilterPopover` (refactored)

Keeps all state (`matchMode`, `quickValues`, `rules`) and the `useEffect` hydration.  
Computes `validRuleCount` with `useMemo`.  
Renders `QuickFilterControl` per quick field and `<AdvancedRulesSection>`.  
Target: ~110 lines.

### `ActiveFilterChips` (refactored)

Wraps `buildChips(...)` in `useMemo([filter, quickFields, ruleFields, removeQuickField, removeRule])`.  
Extracts `Flex` margin style to a module-level constant.

---

## Invariants

- Public API unchanged: same props, same `onApply`/`onClose`/`onChange` signatures.
- `index.ts` exports unchanged.
- No logic changes — pure structural refactor.
- All Biome rules pass: no `useCallback`-wrapped render fns, no `noNonNullAssertion`, proper `import type`.
