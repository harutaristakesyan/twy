# TWY-16: PO Existence Guard + Receivable/Payable Re-sync

**Date:** 2026-05-11  
**Issue:** TWY-16  
**Depends on:** TWY-13 (state machine), TWY-14 (status sync)

---

## Goal

When a Load transitions to `Approved` or `Delivered`:

1. Ensure a Payment Order (PO) exists for the Load
2. Sync the PO's `paymentStatus` per the existing TWY-14 mapping
3. Sync `brokerReceivable` and `carrierPayable` on the PO from the current Load values

---

## Behavior Table

| Load transition | PO existence | Action |
|---|---|---|
| → Approved | exists | sync status + receivable + payable |
| → Approved | missing | auto-create PO, then sync all |
| → Delivered | exists | sync status + receivable + payable |
| → Delivered | missing | block — throw `PaymentOrderRequiredError` |
| → Hold | any | sync status only (no financial re-sync) |
| → Declined | any | sync status only (no financial re-sync) |
| → Pending | any | no-op |

`Hold` is a pause, not a value change — receivable/payable are intentionally not re-synced.

---

## Section 1: Data Model

No schema changes. `paymentOrder` already has all required columns:

- `brokerReceivable numeric(10,2)` — nullable (customerRate may be null on Load)
- `carrierPayable numeric(10,2)` — not null
- `serviceFee numeric(10,2)` — not null, default 30.00
- `incomePercentage numeric(5,2)` — nullable
- `profit numeric(10,2)` — nullable
- `paymentStatus text` — not null

---

## Section 2: Core Logic

### 2a — New Error Class (`packages/core/src/payment-order/repository.ts`)

```ts
export class PaymentOrderRequiredError extends Error {
  readonly code = "payment_order_required";
  constructor() {
    super("A payment order is required before delivering a load");
    this.name = "PaymentOrderRequiredError";
  }
}
```

### 2b — Extended `syncPaymentOrderFromLoad`

**Current signature:**
```ts
syncPaymentOrderFromLoad(tx: Tx, loadId: string, toStatus: LoadStatus): Promise<void>
```

**New signature:**
```ts
syncPaymentOrderFromLoad(
  tx: Tx,
  loadId: string,
  toStatus: LoadStatus,
  financials?: {
    customerRate: string | null;
    carrierRate: string;
    serviceFee: string | null;
  },
): Promise<void>
```

**Logic:**

1. Resolve `targetPaymentStatus` via existing `LOAD_STATUS_TO_PAYMENT_STATUS` map. If null (Pending): return.
2. SELECT PO by `loadId`. If not found: return (no-op).
3. Build the `SET` payload: always include `paymentStatus` + `updatedAt`.
4. If `financials` is provided AND `toStatus` is `Approved` or `Delivered`:
   - `brokerReceivable = customerRate ?? null`
   - `carrierPayable = carrierRate`
   - Recompute and include `profit`, `incomePercentage` from the same formulas used in `createPaymentOrderForLoad`
5. Execute a single `UPDATE paymentOrder SET ... WHERE id = po.id`.

**Formula (same as `createPaymentOrderForLoad`):**
```
income           = customerRate - carrierRate   (null if customerRate is null)
incomePercentage = income / customerRate * 100  (null if income or customerRate null or customerRate = 0)
profit           = income + serviceFee          (null if income is null)
```

**Null `customerRate` handling:** sync `carrierPayable` from `carrierRate`, leave `brokerReceivable` null. No blocking.

### 2c — Updated `changeLoadStatus` (`packages/core/src/load/repository.ts`)

**Expand opening SELECT** to include financial fields:
```ts
const [existing] = await tx
  .select({
    id: load.id,
    status: load.status,
    customerRate: load.customerRate,
    carrierRate: load.carrierRate,
    serviceFee: load.serviceFee,
  })
  .from(load)
  .where(eq(load.id, loadId));
```

**Pre-flight guard for Delivered** (runs after `assertValidTransition`, before load UPDATE):
```ts
if (status === "Delivered") {
  const [existingPO] = await tx
    .select({ id: paymentOrder.id })
    .from(paymentOrder)
    .where(eq(paymentOrder.loadId, loadId));
  if (!existingPO) throw new PaymentOrderRequiredError();
}
```

**Pass financials into sync call:**
```ts
await syncPaymentOrderFromLoad(tx, loadId, status, {
  customerRate: existing.customerRate,
  carrierRate: existing.carrierRate,
  serviceFee: existing.serviceFee,
});
```

The `createPaymentOrderForLoad` call for `Approved` remains unchanged (uses `onConflictDoNothing`, so idempotent). The sync runs after the create, so the PO is guaranteed to exist by then for the Approved case.

---

## Section 3: Error Handling (Lambda Handler)

File: `packages/functions/src/api/load/changeStatus.ts` (or equivalent).

Add `PaymentOrderRequiredError` catch alongside the existing `InvalidTransitionError` catch:

```ts
if (err instanceof PaymentOrderRequiredError) {
  throw createError(400, err.message, { code: err.code });
}
```

The existing `jsonErrorHandler` Middy middleware serializes the `code` field to the response body:
```json
{ "code": "payment_order_required", "message": "A payment order is required before delivering a load" }
```

`PaymentOrderRequiredError` must be exported from `packages/core/src/payment-order/index.ts`.

---

## Section 4: Testing

### Update `packages/core/src/payment-order/sync.test.ts`

- **Approved / Delivered with financials:** assert `setMock` called with `paymentStatus` AND `brokerReceivable`, `carrierPayable`, `profit`, `incomePercentage`.
- **Approved / Delivered without financials param:** assert only `paymentStatus` updated (backward-compat path).
- **Hold / Declined with financials param:** assert only `paymentStatus` updated (financials ignored).
- **Null customerRate:** assert `brokerReceivable: null` in set call, `carrierPayable` still set correctly.

### New `changeLoadStatus` pre-flight tests

Add to the existing test file (or a new `changeStatus.test.ts`):

- `→ Delivered` with no PO → throws `PaymentOrderRequiredError`
- `→ Delivered` with existing PO → proceeds normally
- `→ Approved` with no PO → creates PO, does not throw

---

## Out of Scope

- Audit log (tracked in TWY-19)
- Broker notification on auto-create (separate ticket)
- Currency / rounding changes (current Load fields assumed normalized)
- `Hold` financial re-sync (explicitly excluded — Hold is a pause)
