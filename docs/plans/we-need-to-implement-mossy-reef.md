# Accounting Module (TWY-5) — Implementation Plan

## Context

Linear issue **TWY-5** asks for an Accounting module covering carrier payable, broker
receivable, internal TWY profit tracking, and per-branch billing reports. The lifecycle
walked through in the issue description (Pending → Approved → Approved Paid, with
Declined/Hold side-track) is currently not modelled at all in the codebase:

- `load.status` only has `["Pending","Approved","Denied"]`. No paid/hold states.
- `load` has `customerRate`, `carrierRate`, `chargeAmount`, `isChargable`,
  `chargeServiceFeeToOffice` — but **no `serviceFee`, `incomePercentage`, `charges`**
  columns and no profit derivation.
- No `invoice`, `payment`, or document-type tables exist. The `file` table is
  generic (no `category`/`type` column), attached via `load_files` junction only.
- No scheduled lambdas (`infra/` has no `sst.aws.Cron`); SES domain identities exist
  in `infra/email.ts` but no sending wrapper.
- Dashboard has no `accounting` feature folder.

Goal: deliver the lifecycle, the three reporting views (TWY Accounting / External
Billing / Internal Billing), document categorisation, and due-date reminders, while
reusing the repository → handler → route → `RequirePermission` pattern already
established for `load`, `branch`, `carrier`.

## Scope summary

1. Schema — add `invoice`, `payment`, `loadFinancials` (or extend `load`), enums for
   document categories and invoice/payment status; expand `loadStatusValues`.
2. Core operations under `packages/core/src/{invoice,payment,billing}/`.
3. HTTP handlers under `packages/functions/src/api/{invoice,payment,billing}/` and
   matching `appRoutes` entries in `infra/routes.ts`.
4. New permission resources (`invoices`, `payments`, `billing`) wired into
   `team_permissions` + `auth-context` rebuild + dashboard `RESOURCES`/`MenuFeature`.
5. Dashboard `features/accounting/` with three tab pages + invoice upload + mark-paid
   actions, reusing `useAntdTable` + `formatCurrency` (EUR).
6. Reminder cron (`sst.aws.Cron`) + SES sending helper for "carrier due in N days" /
   "broker overdue".

## 1. Database changes (`packages/db/src/schema/`)

Additive migration only — never edit existing migrations (`packages/db/CLAUDE.md`).
Generate with `pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate`.

### 1a. Convert `load.carrier` text to `carrierId` FK

Today `load.carrier` is free-form text. Accounting needs a stable identity for
carrier-side payable rollups. Migration:

1. Add nullable `carrierId uuid references carrier(id)`.
2. Backfill: best-effort match `load.carrier` text against `carrier.carrierName`
   (case-insensitive). Unmatched rows logged via `process.stdout.write`; left null
   for manual reconciliation.
3. Keep the `carrier` text column for one release as a denormalised fallback (drop
   in a follow-up migration once backfill is verified).
4. Update `createLoad`/`updateLoad` to accept `carrierId` and (optionally) write
   the resolved `carrier` name for backwards-compat.

### 1b. Extend `load.ts`

```ts
export const loadStatusValues = [
  "Pending", "Approved", "ApprovedPaid", "Denied", "Hold",
] as const;

// new columns on load:
serviceFee:        numeric({ precision: 10, scale: 2 }),
incomePercentage:  numeric({ precision: 5,  scale: 2 }), // %, 0–100
charges:           numeric({ precision: 10, scale: 2 }),
financialsLockedAt: timestamp(),  // set when status -> Approved (lock per spec rule)
```

`customerRate`/`carrierRate` stay (broker-receivable / carrier-payable bases).
Profit = `serviceFee + (incomePercentage/100)*customerRate + charges`. Define this
exclusively in `packages/core/src/billing/profit.ts` — never on the frontend.

### 1c. New `invoice.ts`

```ts
export const invoiceTypeValues   = ["carrier","broker"] as const;
export const invoiceStatusValues = ["draft","sent","received","paid","overdue","void"] as const;

export const invoice = pgTable("invoice", {
  id: uuid().primaryKey(),
  loadId: uuid().notNull().references(() => load.id, { onDelete: "restrict" }),
  type: text().$type<InvoiceType>().notNull(),     // carrier | broker
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  currency: text().notNull().default("EUR"),
  issuedAt: timestamp().notNull().defaultNow(),
  dueAt: timestamp().notNull(),                    // issuedAt + paymentTermDays
  paymentTermDays: integer().notNull(),            // 7 carrier / 40 broker default
  status: text().$type<InvoiceStatus>().notNull().default("draft"),
  fileId: uuid().references(() => file.id),        // PDF in S3 (presigned upload)
  createdBy: uuid().references(() => users.id),
  createdAt, updatedAt,
});
// Unique (loadId, type) — at most one carrier and one broker invoice per load.
```

### 1d. New `payment.ts`

```ts
export const paymentStatusValues = ["pending","completed","failed"] as const;

export const payment = pgTable("payment", {
  id: uuid().primaryKey(),
  invoiceId: uuid().notNull().references(() => invoice.id, { onDelete: "restrict" }),
  amount: numeric({ precision: 10, scale: 2 }).notNull(),     // supports partials
  paidAt: timestamp().notNull().defaultNow(),
  method: text(),
  reference: text(),
  status: text().$type<PaymentStatus>().notNull().default("completed"),
  recordedBy: uuid().references(() => users.id),
  createdAt,
});
```

Invoice considered fully paid when `sum(payment.amount where status='completed') >= invoice.amount`.

### 1e. Categorise files

Add nullable column to existing `file.ts`:

```ts
documentCategory: text().$type<DocumentCategory>(), // "rate_confirmation" | "pod" | "carrier_invoice" | "broker_invoice" | "other"
```

Nullable so older rows stay valid.

### 1f. Audit log (per spec rule "Track every action")

`loadAuditLog(id, loadId, actorId, event, payload jsonb, createdAt)` — records status
transitions, invoice/payment events, adjustments after approval.

## 2. Core operations (`packages/core/src/`)

New folders mirroring `core/src/load/`:

- `invoice/{repository.ts,events.ts,index.ts}` — `createInvoice`, `listInvoices`,
  `markInvoiceSent`, `voidInvoice`, `getOverdue(asOf)`.
- `payment/{repository.ts,index.ts}` — `recordPayment`, `listPaymentsForInvoice`.
- `billing/`
  - `profit.ts` — pure profit calculator (unit-tested).
  - `status-machine.ts` — single source of truth for valid transitions:
    `Pending↔Hold`, `Pending→Approved`, `Approved→ApprovedPaid`, `*→Hold`,
    `Hold→Pending`. Throws on illegal moves.
  - `repository.ts` — `getTwyAccountingRows({branchId,...})`,
    `getExternalBillingByBranch({branchId,dateRange})`,
    `getInternalBillingByBranch({branchId,dateRange})`. Each returns rows aggregated
    via Drizzle, scoped through `buildScope(ctx)` exactly like `listLoads`.
  - `transitions.ts` — `tryAutoApprove(loadId)` (carrier+broker invoice both exist
    AND amounts match → set `Approved`, `financialsLockedAt = now()`),
    `tryAutoMarkPaid(loadId)` (both invoices fully paid → `ApprovedPaid`). Called
    from invoice and payment repository functions inside the same `db.transaction`
    using **sequential awaits only** (per `packages/db/CLAUDE.md` Aurora Data API
    pitfall — no `Promise.all` in tx).

Re-export everything from `packages/core/src/index.ts` so handlers can
`import { recordPayment, getInternalBillingByBranch } from "@twy/core"`.

Update `packages/core/src/load/repository.ts`'s `updateLoad` to refuse mutations of
`customerRate/carrierRate/serviceFee/incomePercentage/charges` when
`financialsLockedAt IS NOT NULL` (lock-after-approval rule).

## 3. Handlers (`packages/functions/src/api/`)

Follow the pattern in `packages/functions/src/api/load/list.ts` exactly: `middyfy`
+ Zod event schema + `loadAuthContext` + `assertPermission` + `buildScope`.

```
api/invoice/{create,list,update-status,delete}.ts
api/payment/{create,list}.ts
api/billing/{twy-accounting,external,internal}.ts
```

Zod request/response contracts live in `packages/core/src/<domain>/contracts.ts`
(matches `loadContracts.ts` convention) and are re-exported.

## 4. Routes + linkage (`infra/routes.ts`)

Append to `appRoutes`. All need `["cluster","authContext"]`; invoice create/upload
and any handler that issues a presign for an invoice PDF also needs `"filesBucket"`.

```
POST   /api/invoices               invoice/create        cluster, authContext, filesBucket
GET    /api/invoices               invoice/list          cluster, authContext
PATCH  /api/invoices/{id}/status   invoice/update-status cluster, authContext
DELETE /api/invoices/{id}          invoice/delete        cluster, authContext

POST   /api/payments               payment/create        cluster, authContext
GET    /api/invoices/{id}/payments payment/list          cluster, authContext

GET    /api/billing/twy            billing/twy-accounting cluster, authContext
GET    /api/billing/external       billing/external      cluster, authContext
GET    /api/billing/internal       billing/internal      cluster, authContext
```

## 5. Permissions

- Add resources to `packages/core/src/auth-context/resources.ts` (or wherever
  `RESOURCES` is canonical for the backend) and to
  `apps/dashboard/src/utils/permissions.ts` `RESOURCES` const + `MenuFeature` enum:
  `invoices` (view/create/update/delete), `payments` (view/create),
  `billing` (view-twy, view-external, view-internal).
- Seed the new resource/action rows for existing teams via a one-off
  data migration alongside the schema migration; rebuild auth contexts
  (`packages/core/src/auth-context/rebuild.ts` is already exported — call it from
  the migration script).
- Branch scoping uses existing `team.branchRestricted` + `buildScope(ctx).branchId`
  — no new gating mechanism required.

## 6. Notifications (cron + SES)

- New `infra/cron.ts`: factory `createCron({ db, email, authContext })` that
  provisions an `sst.aws.Cron` with schedule `cron(0 9 * * ? *)` (daily 09:00 UTC),
  invoking `packages/functions/src/events/billingReminders.ts`.
- Handler logic:
  1. `getUpcomingCarrierDue(asOfPlusDays=2)` → "Carrier payment due soon".
  2. `getOverdueBrokerInvoices(asOf=now)` → "Broker invoice overdue".
  3. Email via a new `packages/core/src/email/send.ts` helper wrapping
     `@aws-sdk/client-ses` `SendEmailCommand`, using the SES identity provisioned
     in `infra/email.ts`. Recipient list = branch owner email + accounting team.
- Link the cron Lambda with `["cluster","authContext"]` and add SES send
  permission via `link[]` (SES identity is already an SST resource).
- Add `noConsole` compliant logging via `process.stdout.write` (Biome rule).

## 7. Dashboard (`apps/dashboard/src/features/accounting/`)

Mirror `features/load/`:

```
accounting/
  api/{invoiceApi,paymentApi,billingApi}.ts   # via ApiClient (axios)
  components/
    InvoiceUploadDrawer.tsx          # presigned upload, sets documentCategory
    MarkPaidModal.tsx                # records full or partial payment
    StatusTag.tsx                    # color-coded: Pending=gray, Approved=blue,
                                     # ApprovedPaid=green, Hold=red, Denied=red
    useAccountingColumns.tsx
  pages/
    AccountingPage.tsx               # AntD <Tabs> wrapper
    TwyAccountingTab.tsx             # core load+invoice grid w/ row actions
    ExternalBillingTab.tsx           # per-branch balance owed
    InternalBillingTab.tsx           # profit per load + per branch summary
  providers/AccountingModalProvider.tsx
  types/index.ts
```

Wiring:
- `routes/router.tsx`: add `<Route path="accounting" element={<AccountingPage/>}/>`
  inside the existing `<RequirePermission resource="billing" action="view-twy">`.
- `layouts/Sidebar.tsx`: new menu item gated by `MenuFeature.Accounting`.
- All money formatted with `formatCurrency` from `apps/dashboard/src/utils/formatters.ts`.
- Tables built with `useAntdTable` (no TanStack Query — see `apps/dashboard/CLAUDE.md`).
- Branch filter: AntD `<Select>` populated by existing `branchApi.list`, passed as
  `branchId` query param (server enforces scope regardless).
- File uploads reuse `apps/dashboard/src/libs/fileApi.ts` flow, posting
  `documentCategory` alongside.

## 8. Tests (Vitest)

- `packages/core/src/billing/profit.test.ts` — pure calculation table tests.
- `packages/core/src/billing/status-machine.test.ts` — every legal/illegal transition.
- `packages/core/src/billing/transitions.test.ts` — auto-approve / auto-paid driven
  by mocked invoice + payment repositories; assert no `Promise.all` inside `tx`.
- Handler integration: smoke test for `invoice/create` and `payment/create`
  following `packages/functions/src/api/load/*.test.ts` style.

## Files to create / modify (critical paths)

**Modify**
- `packages/db/src/schema/load.ts` — extend status enum + financial columns + `financialsLockedAt`.
- `packages/db/src/schema/file.ts` — add `documentCategory`.
- `packages/db/src/schema/index.ts` — export new schemas.
- `packages/db/src/index.ts` — re-export new operations.
- `packages/core/src/load/repository.ts` — lock-after-approval guard in `updateLoad`.
- `packages/core/src/index.ts` — re-export accounting modules.
- `infra/routes.ts` — append billing routes.
- `infra/api.ts` — register new linkKeys if any (none new expected; all existing).
- `sst.config.ts → run()` — wire `createCron`.
- `apps/dashboard/src/utils/permissions.ts` — RESOURCES + MenuFeature.
- `apps/dashboard/src/routes/router.tsx`, `layouts/Sidebar.tsx`.

**Create**
- `packages/db/src/schema/{invoice.ts,payment.ts,loadAuditLog.ts}`.
- `packages/db/drizzle/0005_accounting.sql` (auto-generated).
- `packages/core/src/{invoice,payment,billing,email}/**`.
- `packages/functions/src/api/{invoice,payment,billing}/**`.
- `packages/functions/src/events/billingReminders.ts`.
- `infra/cron.ts`.
- `apps/dashboard/src/features/accounting/**`.

## Verification

1. **Migrations apply**
   `pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate` — succeeds; new
   tables visible via `psql` against the dev cluster (`\d invoice`, `\d payment`).
2. **Verify gate** `/verify` (biome ci + turbo build + turbo test) — all green.
3. **Unit tests** `pnpm --filter @twy/core exec vitest run billing` — profit and
   status-machine tables pass.
4. **End-to-end happy path** (against `pnpm sst dev --stage <user>`):
   - Create load (Pending) → confirm row.
   - `POST /api/invoices` (carrier, $1400, term 7) → status stays Pending.
   - `POST /api/invoices` (broker, $2000, term 40) → auto-transition Approved,
     `financialsLockedAt` set.
   - `POST /api/payments` for carrier invoice (full) → still Approved.
   - `POST /api/payments` for broker invoice (full) → status `ApprovedPaid`.
   - Dashboard: each of 3 tabs renders correct rows; profit row reads $250 for the
     scenario in the issue ($100 fee + 5%·$2000=$100 + $50 charges).
5. **Edge cases**
   - Mismatched invoice amount vs `customerRate`/`carrierRate` → load goes to
     `Hold`; UI shows red tag; financial fields editable again.
   - Partial payment ($1500 of $2000) → load stays `Approved`.
   - Attempt to PATCH `customerRate` after approval → 409 from `updateLoad` guard.
6. **Cron** invoke once via `aws lambda invoke` against the dev billing-reminders
   function with a fixture invoice past `dueAt` → SES email lands in the configured
   inbox; idempotent on second invocation (no duplicate sends — store
   `lastReminderSentAt` on `invoice`).
7. **Permissions** flip a test team's `billing:view-twy` to false → `/accounting`
   returns 403 and the sidebar item disappears after re-login.

## Acceptance-criteria mapping (TWY-5)

| Criterion | Covered by |
|---|---|
| Filter by branch and see relevant loads | Branch `<Select>` + server-side `buildScope` |
| Tracks carrier payable + broker receivable | `invoice.type` + `payment` aggregation |
| Status updates correctly | `billing/status-machine.ts` + `transitions.ts` |
| Due dates trigger notifications | `infra/cron.ts` + `billingReminders.ts` |
| Internal vs external billing separation | `billing/external` excludes profit; `billing/internal` exposes only profit |
| Documents uploaded and linked to loads | Existing `load_files` + new `file.documentCategory` |
