# Plan: External & Internal Billing Pages (Nested Branch → Load tables)

## Context

Both `apps/dashboard/src/features/accounting/pages/ExternalBillingPage.tsx` and `InternalBillingPage.tsx` are placeholder Cards. Routes are wired (`/accounting/external-billing`, `/accounting/internal-billing`) and sidebar entries exist. The data layer is already in place — every approved load has a `payment_order` row (`packages/db/src/schema/paymentOrder.ts`) populated by `createPaymentOrderForLoad` (`packages/core/src/payment-order/repository.ts:74`) with: `brokerReceivable`, `carrierPayable`, `serviceFee`, `incomePercentage`, `charges`, `profit`, `carrierPaidAmount/Date`, `brokerReceivedAmount/Date`, plus invoice files via `payment_order_files`.

Accounting wants two distinct lenses on this same data:

- **External Billing** — *what TWY owes the branch on the carrier side / what TWY received from brokers*. Branch summary on top; expand to per-load. **Excludes** service fee, charges, income %.
- **Internal Billing** — *TWY's own profit*. Branch summary on top; expand to per-load with service fee, income %, charges, profit, and uploaded invoice docs.

No new schema is needed — both views are aggregations + per-load reads of `payment_order`.

## Approach

Use AntD `<Table expandable={{ expandedRowRender, onExpand }}>` for the nested-table UX (https://ant.design/components/table#table-demo-expand — expandedRowRender returns a fully-styled inner `<Table>`). Outer table is per-branch with the "owed" totals; inner table is lazy-loaded on first expand for that branch and cached client-side.

Backend exposes 4 new endpoints (2 per view) under a new `billing` domain in `@twy/core`. Reuses the existing `buildScope` pattern from `payment-order/list.ts` so a non-admin user is scoped to their own branch (the outer table will then show a single row).

## Backend

### 1. New core domain `packages/core/src/billing/`

```
packages/core/src/billing/
  request.ts        # 4 Zod schemas
  response.ts       # 4 response types
  repository.ts     # 4 aggregation/list queries against payment_order
  index.ts          # barrel
```

Add `export * from "./billing/index.js";` to `packages/core/src/index.ts`.

`repository.ts` queries (use existing `paymentOrder`, `branch`, `load`, `carrier`, `paymentOrderFiles`, `file` from `@twy/db`):

- `listExternalBillingByBranch({ branchId? })` — `SELECT branch.id, branch.name, COUNT(*) loadCount, SUM(brokerReceivable) totalBrokerReceivable, SUM(brokerReceivedAmount) totalBrokerReceived, SUM(carrierPayable) totalCarrierPayable, SUM(carrierPaidAmount) totalCarrierPaid FROM payment_order JOIN branch ... GROUP BY branch.id, branch.name`. The "owed to branch" delta = `totalBrokerReceivable - totalCarrierPayable` computed in JS.
- `listExternalBillingLoadsForBranch({ branchId })` — per-load rows: `referenceNumber, carrierName, brokerReceivable, brokerReceivedAmount, brokerReceivedDate, carrierPayable, carrierPaidAmount, carrierPaidDate, paymentStatus`. **No service fee / charges / income %.**
- `listInternalBillingByBranch({ branchId? })` — `SELECT branch.id, branch.name, COUNT(*) loadCount, SUM(serviceFee), SUM(charges), SUM(profit), AVG(incomePercentage)` grouped by branch.
- `listInternalBillingLoadsForBranch({ branchId })` — per-load: `referenceNumber, carrierName, serviceFee, incomePercentage, charges, profit, paymentStatus, invoices[]` (reuse `fetchInvoicesForPaymentOrders` pattern at `payment-order/repository.ts:52`).

Numeric coercion: reuse the `numericToNumber` helper pattern (`payment-order/repository.ts:19`).

### 2. Handlers `packages/functions/src/api/billing/`

Four handlers, each ~30 lines, mirroring `packages/functions/src/api/payment-order/list.ts`:

- `external-by-branch.ts` → `GET /api/billing/external/branches`
- `external-loads.ts` → `GET /api/billing/external/branches/{branchId}/loads`
- `internal-by-branch.ts` → `GET /api/billing/internal/branches`
- `internal-loads.ts` → `GET /api/billing/internal/branches/{branchId}/loads`

Each calls `loadAuthContext` + `assertPermission(ctx, "payment_orders", "view")` + `buildScope(ctx)`. If the request specifies `{branchId}` in the path, reject when `scope.branchId && scope.branchId !== branchId` (Forbidden). For the by-branch summary endpoints, pass `scope.branchId` into the repository so non-admins only see their own branch.

### 3. Routes `infra/routes.ts`

Append to `appRoutes` (after the payment-order block at line 336):

```ts
{ handler: "packages/functions/src/api/billing/external-by-branch.handler",
  routeKey: "GET /api/billing/external/branches",
  requiresAuth: true, linkKeys: ["cluster", "authContext"] },
{ handler: "packages/functions/src/api/billing/external-loads.handler",
  routeKey: "GET /api/billing/external/branches/{branchId}/loads",
  requiresAuth: true, linkKeys: ["cluster", "authContext"] },
{ handler: "packages/functions/src/api/billing/internal-by-branch.handler",
  routeKey: "GET /api/billing/internal/branches",
  requiresAuth: true, linkKeys: ["cluster", "authContext"] },
{ handler: "packages/functions/src/api/billing/internal-loads.handler",
  routeKey: "GET /api/billing/internal/branches/{branchId}/loads",
  requiresAuth: true, linkKeys: ["cluster", "authContext"] },
```

## Frontend

### 1. API client `apps/dashboard/src/features/accounting/api/billingApi.ts` (new)

Mirror `paymentOrderApi.ts:1` shape. Four methods: `listExternalByBranch()`, `listExternalLoads(branchId)`, `listInternalByBranch()`, `listInternalLoads(branchId)`.

### 2. Types `apps/dashboard/src/features/accounting/types/billing.ts` (new)

`ExternalBillingBranch`, `ExternalBillingLoad`, `InternalBillingBranch`, `InternalBillingLoad`. Match backend response shapes 1:1.

### 3. `ExternalBillingPage.tsx` — full rewrite

Pattern: AntD `<Table>` with `expandable.expandedRowRender`. Outer rows = branches; expansion lazy-loads the inner per-load `<Table>` via `useRequest({ manual: true })` keyed by `branchId`, caching results in a `Map<branchId, ExternalBillingLoad[]>` in state so a re-expand doesn't re-fetch.

Outer columns: Branch · Loads · Broker Receivable · Broker Received · Carrier Payable · Carrier Paid · **Owed to Branch** (`carrierPayable - carrierPaid` highlighted). Footer row in the outer table via `<Table.Summary>` shows totals.

Inner columns (in `expandedRowRender`): Reference · Carrier · Broker Receivable · Broker Received · Carrier Payable · Carrier Paid · Status. **No service fee / charges / income %.**

Reuse `formatCurrency` and `formatDate` helpers from `PaymentOrdersPage.tsx:18`.

### 4. `InternalBillingPage.tsx` — full rewrite

Same expandable-table shape, but with TWY-income lens.

Outer columns: Branch · Loads · Total Service Fee · Total Charges · Avg Income % · **Total Profit**. Summary footer.

Inner columns: Reference · Carrier · Service Fee · Income % · Charges · **Profit** · Status · **Invoices** (count + popover/list of clickable filenames; reuse `fileApi.downloadFile` via `paymentOrderApi.downloadInvoice` at `paymentOrderApi.ts:42`).

### 5. Lazy-load wiring (used in both pages)

```tsx
const [loadsByBranch, setLoadsByBranch] = useState<Map<string, BranchLoad[]>>(new Map());
const { runAsync: fetchLoads, loading } = useRequest(billingApi.listExternalLoads, { manual: true });

const onExpand = useCallback(async (expanded: boolean, record: BranchRow) => {
  if (!expanded || loadsByBranch.has(record.branchId)) return;
  const data = await fetchLoads(record.branchId);
  setLoadsByBranch((prev) => new Map(prev).set(record.branchId, data));
}, [fetchLoads, loadsByBranch]);

const expandedRowRender = (record: BranchRow) => (
  <Table size="small" loading={loading && !loadsByBranch.has(record.branchId)}
         dataSource={loadsByBranch.get(record.branchId) ?? []}
         columns={innerColumns} rowKey="loadId" pagination={false} />
);

<Table ... expandable={{ expandedRowRender, onExpand }} />
```

This honours the dashboard's `useExhaustiveDependencies: error` rule (every fetcher wrapped in `useCallback`).

## Critical files

- `packages/db/src/schema/paymentOrder.ts` (read-only — source of truth for fields)
- `packages/core/src/payment-order/repository.ts:19,52,74` (patterns to mirror)
- `packages/core/src/billing/{request,response,repository,index}.ts` (new)
- `packages/core/src/index.ts` (add `export * from "./billing/index.js";`)
- `packages/functions/src/api/billing/{external-by-branch,external-loads,internal-by-branch,internal-loads}.ts` (new)
- `infra/routes.ts:361` (append 4 RouteDefs to `appRoutes`)
- `apps/dashboard/src/features/accounting/api/billingApi.ts` (new)
- `apps/dashboard/src/features/accounting/types/billing.ts` (new)
- `apps/dashboard/src/features/accounting/pages/ExternalBillingPage.tsx` (rewrite)
- `apps/dashboard/src/features/accounting/pages/InternalBillingPage.tsx` (rewrite)

## Verification

1. `pnpm --filter @twy/core build && pnpm --filter @twy/functions build && pnpm --filter @twy/dashboard build` — all three succeed.
2. `pnpm sst deploy --stage dev` — new routes deploy, IAM derived automatically.
3. Manual:
   - Sign in as admin → External Billing shows one row per branch with totals; expand → loads table with no service fee column. Click a different branch — inner table appears for it independently. Re-collapse + re-expand: no extra network call (cached).
   - Sign in as branch-scoped user → only that branch's row appears.
   - Internal Billing → branch totals show profit column; expand → per-load row shows invoice count; clicking an invoice triggers download via `fileApi.downloadFile`.
   - Verify `Owed to Branch = carrierPayable - carrierPaid` matches a hand-computed value for one branch.
4. `pnpm verify` (biome + build + tests) before `/ship`.
