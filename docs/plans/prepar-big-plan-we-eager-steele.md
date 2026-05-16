# Load refactor — broker as FK, payment fields move to broker/carrier, auto reference number

## Context

The current `load` table denormalises the customer side: free-text `customer` name, `contactName`, `paymentMethod`, `paymentTerms` all live on each load row. The carrier side is half-normalised — there is a `carrierId` FK *plus* a leftover `carrier` text column *plus* a `carrierPaymentMethod` on each load. Reference numbers are user-typed strings (UNIQUE-enforced, but easy to collide on).

This refactor flattens the model: each load points to exactly one broker (`brokerId` FK), payment configuration is owned by the broker and the carrier, and reference numbers are server-generated in the form `L-YYYY-NNNNNNNN` (8 digits, reset each year).

Outcomes:
- `load` shrinks by six columns; `brokerId` is required (NOT NULL).
- Broker and carrier both gain `paymentMethod` + `paymentTerms` — single source of truth, edited on the broker/carrier page.
- `referenceNumber` is generated server-side from a per-year counter — clients no longer send it.
- Existing dev load rows are truncated in the same migration (user accepted; no prod data to preserve yet).

---

## Phase 1 — Database schema

### 1.1 New table `load_ref_seq` (per-year counter)

Create `packages/db/src/schema/loadRefSeq.ts`:

```ts
import { bigint, integer, pgTable } from "drizzle-orm/pg-core";

export const loadRefSeq = pgTable("load_ref_seq", {
  year: integer().primaryKey(),
  lastValue: bigint({ mode: "number" }).notNull(),
});

export type LoadRefSeqRow = typeof loadRefSeq.$inferSelect;
```

Re-export from `packages/db/src/schema/index.ts`.

Used by an atomic UPSERT to allocate the next number per year — see Phase 2.

### 1.2 `outside_broker` — add payment fields

Edit `packages/db/src/schema/outsideBroker.ts`. Add (nullable, no default):
- `paymentMethod: text()`
- `paymentTerms: text()`

### 1.3 `carrier` — add payment fields

Edit `packages/db/src/schema/carrier.ts`. Add (nullable, no default):
- `paymentMethod: text()`
- `paymentTerms: text()`

### 1.4 `load` — drop denormalised columns, add `brokerId`

Edit `packages/db/src/schema/load.ts`:

**Drop:** `customer`, `contactName`, `paymentMethod`, `paymentTerms`, `carrier`, `carrierPaymentMethod`.

**Add:**
```ts
brokerId: uuid()
  .notNull()
  .references(() => outsideBroker.id, { onDelete: "restrict" }),
```

**Keep but treat as server-managed:** `referenceNumber` stays `text().notNull().unique()`.

### 1.5 Generate + edit migration

```bash
pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate
```

The generated SQL will be a single new file under `packages/db/drizzle/0020_*.sql`. Hand-edit it so the destructive load changes are safe:

```sql
-- Truncate first because brokerId is NOT NULL (dev-only; user approved drop & recreate)
TRUNCATE TABLE "load_files", "load_stop", "load_comment", "payment_order", "payment_order_files", "load" CASCADE;

-- Then the auto-generated ALTERs (drop cols, add brokerId, etc.)
-- Then the new tables (load_ref_seq), and ALTERs on outside_broker / carrier.
```

> The TRUNCATE list above cascades the load-dependent rows. The migration runner does not start a transaction around each file's statements, so this is a single irreversible operation — fine for dev.

Apply:

```bash
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
```

---

## Phase 2 — Reference number generator

Add `packages/core/src/load/refNumber.ts`:

```ts
import { loadRefSeq } from "@twy/db";
import { sql } from "drizzle-orm";
import type { DB } from "@twy/db";

export async function allocateLoadReferenceNumber(
  tx: DB,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const [row] = await tx
    .insert(loadRefSeq)
    .values({ year, lastValue: 1 })
    .onConflictDoUpdate({
      target: loadRefSeq.year,
      set: { lastValue: sql`${loadRefSeq.lastValue} + 1` },
    })
    .returning({ lastValue: loadRefSeq.lastValue });
  return `L-${year}-${String(row.lastValue).padStart(8, "0")}`;
}
```

**Why `INSERT … ON CONFLICT DO UPDATE` and not `SELECT … FOR UPDATE`:** the UPSERT takes a row lock on the conflicting `(year)` key inside one SQL statement — concurrent inserts of a new load for the same year serialise behind it. No second round-trip, no race window.

**Concurrency note:** the Aurora Data API serialises statements per `transactionId` (see `packages/db/CLAUDE.md` pitfall). Calling this inside `db.transaction(async (tx) => …)` is correct as long as we `await` sequentially (we do).

### Wire into `createLoad`

In `packages/core/src/load/repository.ts`, change `createLoad` to wrap the insert in a transaction:

```ts
return await db.transaction(async (tx) => {
  const referenceNumber = await allocateLoadReferenceNumber(tx);
  const id = randomUUID();
  await tx.insert(load).values({ id, referenceNumber, brokerId, ...rest });
  // existing load_stop + load_files inserts, still sequentially awaited
  return getLoadByIdInternal(tx, id);
});
```

If the load insert fails (FK violation, etc.) the transaction rolls back and `lastValue` is not incremented — so reference numbers stay contiguous on failure too.

---

## Phase 3 — Backend (contracts, repository, handlers)

### 3.1 Load Zod contracts — `packages/core/src/load/request.ts`

In `LoadBaseSchema`:
- **Remove:** `customer`, `referenceNumber`, `contactName`, `paymentMethod`, `paymentTerms`, `carrier` (the text one), `carrierPaymentMethod`.
- **Add:** `brokerId: z.uuid()` (required).
- Keep: `customerRate`, `carrierId`, `carrierRate`, `chargeServiceFeeToOffice`, `loadType`, `serviceType`, `serviceGivenAs`, `commodity`, `bookedAs`, `soldAs`, `weight`, `temperature`, `pickups`, `dropoffs`, `files`.

In `ListLoadsEventSchema`:
- Drop `customer` from the `sortField` enum; add `broker` (sorts by joined `outsideBroker.brokerName`).
- Add an optional `brokerId` filter to the existing filter shape (mirrors `carrierId` if one exists; otherwise add as a new optional UUID).

### 3.2 Load response — `packages/core/src/load/response.ts`

The response shape changes to embed broker + carrier read-models:

```ts
broker: { id, brokerName, contactName, phone, email, paymentMethod, paymentTerms } | null
carrier: { id, carrierName, mcDotNumber, paymentMethod, paymentTerms } | null
```

Remove the old `customer`, `contactName`, `paymentMethod`, `paymentTerms`, `carrier` (text), `carrierPaymentMethod` fields from the response type.

### 3.3 Repository — `packages/core/src/load/repository.ts`

- **`createLoad`** — wrap in `db.transaction`; call `allocateLoadReferenceNumber(tx)`; insert with `brokerId`; drop the now-removed fields from the insert values.
- **`updateLoad`** — strip the removed fields from the payload type; `brokerId` is editable but cannot be null.
- **`listLoads`** + **`getLoadById`** — add `leftJoin(outsideBroker, eq(load.brokerId, outsideBroker.id))` (becomes `innerJoin` since `brokerId` is NOT NULL) and `leftJoin(carrier, eq(load.carrierId, carrier.id))`. Project the broker/carrier subobjects shown in §3.2.
- **`changeLoadStatus`** — no change (does not touch the removed fields).

### 3.4 Broker contracts — `packages/core/src/outside-broker/`

Add `paymentMethod` and `paymentTerms` (both `z.string().nullish()`) to the create/update request schemas. Add to the response schema. Update the repository's insert/update field list.

### 3.5 Carrier contracts — `packages/core/src/carrier/`

Same change as broker — `paymentMethod` + `paymentTerms` nullable, included on create/update/response/repository.

### 3.6 Handlers

The handler files under `packages/functions/src/api/load/`, `packages/functions/src/api/outside-broker/`, and `packages/functions/src/api/carrier/` are thin pass-throughs to the repository — no per-handler changes beyond what the schema regeneration gives you. No route changes; `infra/routes.ts` stays as-is.

---

## Phase 4 — UI (dashboard)

### 4.1 Load create / edit forms

Files: `apps/dashboard/src/features/load/pages/CreateLoadPage.tsx`, `apps/dashboard/src/features/load/pages/LoadEditModal.tsx`.

In Step 0 ("Customer & Carrier"):
- **Remove** inputs: `customer` (the BrokerAutocomplete's text-only mode), `referenceNumber`, `contactName`, `paymentMethod`, `paymentTerms`, `carrierPaymentMethod`.
- **Change** the existing `BrokerAutocomplete` to write `brokerId` (the `id` from its `(id, name)` callback) into the form. Make broker required.
- **Add** a small read-only "Broker payment summary" panel under the BrokerAutocomplete that shows the selected broker's `contactName`, `paymentMethod`, and `paymentTerms` (fetched via the existing `GET /api/outside-brokers/{id}` endpoint, gated on selection). Pure context — not editable here.
- **Add** an equivalent read-only "Carrier payment summary" under the `CarrierAutocomplete` (shows carrier's `paymentMethod` + `paymentTerms`).
- **Keep:** `customerRate`, `carrierRate`, `chargeServiceFeeToOffice`.

Step 1 (Service & Booking) and later steps are unchanged.

The create form no longer needs a `referenceNumber` field — the server fills it. Show the assigned reference number in the success toast / redirect.

### 4.2 Load list columns

File: `apps/dashboard/src/features/load/hooks/useLoadColumns.tsx`.

- Rename the `customer` column to `broker`; render `row.broker?.brokerName ?? "—"`.
- Update `sortField` mapping to use `broker` instead of `customer`.

### 4.3 Load TS type

File: `apps/dashboard/src/features/load/types/load.ts`.

Mirror the response change in §3.2 — replace flat customer/payment/carrier-text fields with `broker: { … } | null` and `carrier: { … } | null` subobjects. Remove `customer`, `referenceNumber` (still readable on the row), `contactName`, `paymentMethod`, `paymentTerms`, `carrierPaymentMethod` from inputs but keep `referenceNumber` as a read-only output field on `Load`.

### 4.4 Broker create / edit modals

Files: `apps/dashboard/src/features/outside-broker/components/OutsideBrokerCreateModal.tsx`, `OutsideBrokerEditModal.tsx`, and `apps/dashboard/src/features/outside-broker/types/broker.ts`.

- Add two new `FormTextField` inputs: "Payment method" and "Payment terms" (both optional, free-text — matches schema).
- Mirror on the type.

### 4.5 Carrier create / edit modal

Files: `apps/dashboard/src/features/carrier/components/CarrierCreateModal.tsx` (used for both create and edit) and `apps/dashboard/src/features/carrier/types/carrier.ts`.

- Add the same two inputs as in §4.4.
- Mirror on the type.

---

## Files touched

**Schema + migration**
- `packages/db/src/schema/load.ts` *(modify)*
- `packages/db/src/schema/outsideBroker.ts` *(modify)*
- `packages/db/src/schema/carrier.ts` *(modify)*
- `packages/db/src/schema/loadRefSeq.ts` *(new)*
- `packages/db/src/schema/index.ts` *(re-export)*
- `packages/db/drizzle/0020_*.sql` *(generated, then hand-edited to add the TRUNCATE)*

**Core (business logic + contracts)**
- `packages/core/src/load/refNumber.ts` *(new)*
- `packages/core/src/load/repository.ts` *(modify — `createLoad` tx wrap; list/get joins; field removals)*
- `packages/core/src/load/request.ts` *(modify — `LoadBaseSchema`, `ListLoadsEventSchema`)*
- `packages/core/src/load/response.ts` *(modify — embed broker/carrier subobjects)*
- `packages/core/src/load/index.ts` *(re-export `allocateLoadReferenceNumber` only if needed externally; otherwise skip)*
- `packages/core/src/outside-broker/{request,response,repository}.ts` *(add payment fields)*
- `packages/core/src/carrier/{request,response,repository}.ts` *(add payment fields)*

**UI**
- `apps/dashboard/src/features/load/pages/CreateLoadPage.tsx`
- `apps/dashboard/src/features/load/pages/LoadEditModal.tsx`
- `apps/dashboard/src/features/load/hooks/useLoadColumns.tsx`
- `apps/dashboard/src/features/load/types/load.ts`
- `apps/dashboard/src/features/outside-broker/components/OutsideBrokerCreateModal.tsx`
- `apps/dashboard/src/features/outside-broker/components/OutsideBrokerEditModal.tsx`
- `apps/dashboard/src/features/outside-broker/types/broker.ts`
- `apps/dashboard/src/features/carrier/components/CarrierCreateModal.tsx`
- `apps/dashboard/src/features/carrier/types/carrier.ts`

---

## Existing primitives to reuse (do not rebuild)

- `BrokerAutocomplete` (`apps/dashboard/src/features/outside-broker/components/BrokerAutocomplete.tsx`) — already returns `(id, name)`; just bind its `id` to the form's `brokerId`.
- `CarrierAutocomplete` — same shape, already wired.
- `FormTextField`, `FormSelect`, etc. (`apps/dashboard/src/components/form/FormField.tsx`) — use for new broker/carrier payment inputs.
- `db.transaction(...)` and `sql` from `drizzle-orm` — already used in the repository; keep awaits sequential per the Data API pitfall in `packages/db/CLAUDE.md`.

---

## Verification

1. **Schema sanity**
   ```bash
   pnpm --filter @twy/db build
   pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
   ```
   Confirm `load_ref_seq` exists, `load.broker_id` is NOT NULL, `load.customer`/`contact_name`/`payment_method`/`payment_terms`/`carrier`/`carrier_payment_method` are gone, `outside_broker` and `carrier` each have `payment_method` + `payment_terms`.

2. **Reference number generation**
   - Create 3 loads in a row (`POST /api/loads`); confirm they get `L-2026-00000001`, `L-2026-00000002`, `L-2026-00000003`.
   - Manually edit `load_ref_seq` row to `(year=2025, last_value=42)`, set system clock or pass a date override into the helper, generate one — should yield `L-2025-00000043`.
   - Try a concurrent burst (e.g. 10 parallel POSTs via a quick script): every row should get a unique reference number, no gaps unless a load insert failed.

3. **End-to-end CRUD**
   - Create a new broker in the dashboard with `paymentMethod = "ACH"` and `paymentTerms = "Net 30"`. Verify both persist via list + edit.
   - Create a new carrier with the same fields. Verify.
   - Create a new load via the dashboard: pick the new broker + carrier, confirm the read-only "broker payment summary" + "carrier payment summary" panels render. Confirm the new load's reference number is shown on the success toast and in the list table.
   - Edit the load, change the broker, confirm the summary updates.
   - Sort the load list by `broker` column — confirm the API returns sorted-by-`broker_name`.

4. **Repo gates**
   ```bash
   /verify       # biome ci, turbo build, turbo test — must all pass
   ```
   Then run the `code-reviewer` subagent against the diff and fix every blocker/major before `/ship`.

5. **Deprecations**
   No new deprecations should surface in the IDE / `tsc` / `biome ci`. If any do (e.g. removed-field references in tests or other UI), fix them in the same change — per the "no deprecations on commit" rule.
