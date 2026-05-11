# Load Status State Machine — Design Spec (TWY-13)

**Date:** 2026-05-11  
**Status:** Approved  
**Ticket:** TWY-13

---

## Goal

Make Load status a proper state machine. Rename two existing status values to match the domain language. Enforce transitions server-side with a structured error. Give the UI affordance-level filtering. Add tests covering every allowed and a representative set of forbidden transitions.

Audit log deferred to a later ticket.

---

## Allowed Transitions

| From | To |
|---|---|
| `Pending` | `Approved`, `Hold`, `Declined`, `Delivered` |
| `Approved` | `Hold`, `Declined`, `Delivered` |
| `Hold` | `Approved` |
| `Delivered` | `Hold` |
| `Declined` | *(terminal — no outgoing)* |

No transition may return to `Pending` from any other state.

---

## Section 1 — Status Rename + DB Schema

**File:** `packages/db/src/schema/load.ts`

- `"Denied"` → `"Declined"`
- `"ApprovedPaid"` → `"Delivered"`

**Migration:** New Drizzle migration that UPDATEs existing rows:
```sql
UPDATE load SET status = 'Declined' WHERE status = 'Denied';
UPDATE load SET status = 'Delivered' WHERE status = 'ApprovedPaid';
```

**UI type:** `apps/dashboard/src/features/load/types/load.ts` — same rename on the `LoadStatus` union type.

---

## Section 2 — State Machine (`@twy/core`)

**File:** `packages/core/src/load/status-machine.ts`

Replace the transition table with the spec-exact set above. Exports:

```typescript
export const isValidTransition = (from: LoadStatus, to: LoadStatus): boolean
export const getAllowedTransitions = (from: LoadStatus): LoadStatus[]
export const assertValidTransition = (from: LoadStatus, to: LoadStatus): void  // throws InvalidTransitionError
export class InvalidTransitionError extends Error {
  readonly code = "invalid_transition";
  readonly from: LoadStatus;
  readonly to: LoadStatus;
  readonly allowed: LoadStatus[];
}
```

`assertValidTransition` throws `InvalidTransitionError` (not `http-errors`) — keeps the machine free of HTTP concerns.

`InvalidTransitionError` is re-exported from `packages/core/src/index.ts`.

---

## Section 3 — Structured Error Handling

**File:** `packages/functions/src/api/load/changeStatus.ts`

The handler wraps `changeLoadStatusRecord` in a try/catch, converts `InvalidTransitionError` to a structured http-errors 400:

```typescript
} catch (err) {
  if (err instanceof InvalidTransitionError) {
    throw Object.assign(createError(400, err.message), {
      code: err.code,
      from: err.from,
      to: err.to,
      allowed: err.allowed,
    });
  }
  throw err;
}
```

**File:** `packages/functions/src/shared/middy/jsonErrorHandler.ts`

Update the serialiser to forward any extra enumerable own properties from the http-errors instance into the JSON response body alongside `statusCode`, `error`, and `message`. Client receives:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot transition load status from \"Declined\" to \"Pending\"",
  "code": "invalid_transition",
  "from": "Declined",
  "to": "Pending",
  "allowed": []
}
```

---

## Section 4 — Repository

**File:** `packages/core/src/load/repository.ts`

One change in `changeLoadStatus` — `financialsLockedAt` locking condition:

```typescript
// before
status === "Approved" || status === "ApprovedPaid"
// after
status === "Approved" || status === "Delivered"
```

Everything else unchanged: `createPaymentOrderForLoad` still fires on `Approved`; `Hold` unlock (`financialsLockedAt: null`) is unchanged.

---

## Section 5 — UI

### New file: `apps/dashboard/src/features/load/utils/statusMachine.ts`

Pure data mirror of the transition table — no external deps:

```typescript
import type { LoadStatus } from "@/features/load/types/load";

const TRANSITIONS: [LoadStatus, LoadStatus][] = [
  ["Pending", "Approved"],
  ["Pending", "Hold"],
  ["Pending", "Declined"],
  ["Pending", "Delivered"],
  ["Approved", "Hold"],
  ["Approved", "Declined"],
  ["Approved", "Delivered"],
  ["Hold", "Approved"],
  ["Delivered", "Hold"],
];

export const getAllowedTransitions = (from: LoadStatus): LoadStatus[] =>
  TRANSITIONS.filter(([f]) => f === from).map(([, t]) => t);
```

### Updated: `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx`

- Replace hardcoded `STATUS_OPTIONS` with options derived from `getAllowedTransitions(load.status)`
- If `getAllowedTransitions` returns an empty array (i.e. current status is `Declined`), show a "This load is in a terminal state and cannot be transitioned further" message instead of the select + submit button

---

## Section 6 — Tests

**File:** `packages/core/src/load/status-machine.test.ts` (new)

- Every allowed transition (9 cases): `isValidTransition(from, to)` returns `true`
- Representative forbidden transitions:
  - `Hold → Pending` (removed from old machine)
  - `Declined → Pending` (terminal)
  - `Declined → Approved` (terminal)
  - `Delivered → Approved` (not in table)
  - `Pending → Pending` (no self-transitions)
- "Can never return to Pending" invariant: for every status except `Pending`, `getAllowedTransitions(status)` must not contain `"Pending"`
- `getAllowedTransitions` exact-set assertion per status (5 statuses)

---

## Out of Scope

- Audit log table (deferred)
- Payment Order sync on status change (TWY-14)
- Receivable/payable sync (TWY-16)
- Permission gating per status (TWY-15)
