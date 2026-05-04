# Remove Branch from Outside Broker

**Date:** 2026-05-04  
**Status:** Approved

## Problem

Outside brokers and broker requests have a `branchId` foreign key that was added but never used for access control or filtering. Branch data is stored but serves no product purpose, and the branch select field in the create/edit modals adds unnecessary complexity.

## Goal

Completely remove the branch field from the outside broker and broker request domains — database, backend, and frontend.

## Scope

Pure subtraction. No new logic, no new entities, no behaviour changes.

---

## Layer-by-layer changes

### 1. DB schema + migration

- `packages/db/src/schema/outsideBroker.ts` — remove `branchId` column definition
- `packages/db/src/schema/brokerRequest.ts` — remove `branchId` column definition
- Run `drizzle-kit generate` → produces SQL migration that drops `branch_id` from both tables

### 2. Core — outside-broker

`packages/core/src/outside-broker/`

- `request.ts` — remove `branchId` from update schema; remove `"branch"` from sort-field enum
- `response.ts` — remove `branch: { id: string; name: string } | null` from response type
- `repository.ts` — remove `branchId` from `NewBrokerInput` and `UpdateBrokerInput`; remove `leftJoin(branch, eq(outsideBroker.branchId, branch.id))`; remove `"branch"` sort case; remove `branchId` from create/update calls

### 3. Core — broker-request

`packages/core/src/broker-request/`

- `request.ts` — remove `branchId` from submit schema
- `response.ts` — remove `branchId: string | null` from response type
- `repository.ts` — remove `branchId` from `SubmitBrokerRequestInput`; remove from `mapRow`; remove from insert call

### 4. Lambda handlers

- `packages/functions/src/api/outside-broker/update.ts` — stop destructuring/passing `branchId`
- `packages/functions/src/api/broker-request/create.ts` — stop destructuring/passing `branchId`

### 5. Dashboard — types

- `apps/dashboard/src/features/outside-broker/types/broker.ts` — remove `branch` sort option; remove `branchId` / `branch` fields from form and request types
- `apps/dashboard/src/features/outside-broker/types/brokerRequest.ts` — remove `branchId` from response type

### 6. Dashboard — UI

- `OutsideBrokerCreateModal.tsx` — remove branch `<Select>` field; remove `branches` and `loadingBranches` props
- `OutsideBrokerEditModal.tsx` — remove branch `<Select>` field; remove `branches` and `loadingBranches` props
- `OutsideBrokerModalProvider.tsx` — remove `branches`/`loadingBranches` from `openOutsideBrokerCreate` and `openOutsideBrokerEdit` context signatures
- `OutsideBrokersManagementTable.tsx` — remove `useRequest` for branches; remove branches/branchesLoading passed to modal open calls
- `useOutsideBrokerColumns.tsx` — remove Branch column from table display if present; remove branches/loadingBranches params if passed

---

## Out of scope

- Carrier requests — unrelated; already has no branch field issue
- Loads, users, branches — untouched
- No access-control logic changes (branch was never used for filtering)

## Verification

1. `pnpm check:ci && pnpm build && pnpm test`
2. Create modal opens with no branch field
3. Edit modal opens with no branch field
4. Broker list table has no Branch column
5. Submit a broker request — succeeds with no branchId in payload
6. DB migration applies cleanly against dev cluster
