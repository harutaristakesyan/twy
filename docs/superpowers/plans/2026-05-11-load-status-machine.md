# Load Status State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Load status as a state machine with renamed values (`Denied`→`Declined`, `ApprovedPaid`→`Delivered`), spec-exact transitions, structured error responses, and UI affordance filtering.

**Architecture:** Pure transition rules live in `@twy/core/status-machine.ts` (server enforcement) and are mirrored as a zero-dep lookup in `apps/dashboard/src/features/load/utils/statusMachine.ts` (UI affordance). A new `InvalidTransitionError` class carries structured `from`/`to`/`allowed` fields; `jsonErrorHandler` forwards them into the JSON response body. No audit log in this ticket.

**Tech Stack:** Drizzle ORM (Aurora Serverless v2 / RDS Data API), `@twy/core`, `@twy/functions` (Middy), React 19 + Ant Design 6, Vitest 4.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `packages/db/src/schema/load.ts` | Rename status values in `loadStatusValues` |
| Create | `packages/db/drizzle/0010_rename_load_statuses.sql` | Data migration — UPDATE existing rows |
| Modify | `packages/db/drizzle/meta/_journal.json` | Register migration 0010 |
| Modify | `apps/dashboard/src/features/load/types/load.ts` | Rename `LoadStatus` union |
| Modify | `apps/dashboard/src/features/load/components/useLoadColumns.tsx` | Rename `statusColors` keys |
| Modify | `apps/dashboard/src/features/load/components/LoadManagementTable.tsx` | Rename status filter option values/labels |
| Modify | `packages/core/src/load/status-machine.ts` | New transitions, `InvalidTransitionError`, `getAllowedTransitions` |
| Create | `packages/core/src/load/status-machine.test.ts` | Tests for every allowed + forbidden transition |
| Modify | `packages/core/src/load/repository.ts` | Fix `financialsLockedAt` reference (`ApprovedPaid`→`Delivered`) |
| Modify | `packages/functions/src/shared/middy/jsonErrorHandler.ts` | Forward extra error properties into response body |
| Modify | `packages/functions/src/api/load/changeStatus.ts` | Catch `InvalidTransitionError`, throw structured 400 |
| Create | `apps/dashboard/src/features/load/utils/statusMachine.ts` | UI-side transition lookup (pure data) |
| Modify | `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx` | Dynamic options from `getAllowedTransitions`; terminal-state message |

---

## Task 1: Rename status values in DB schema and UI type

**Files:**
- Modify: `packages/db/src/schema/load.ts`
- Modify: `apps/dashboard/src/features/load/types/load.ts`

- [ ] **Step 1: Edit `packages/db/src/schema/load.ts`**

  Find the `loadStatusValues` const (line 16) and replace:

  ```typescript
  // before
  export const loadStatusValues = ["Pending", "Approved", "ApprovedPaid", "Denied", "Hold"] as const;

  // after
  export const loadStatusValues = ["Pending", "Approved", "Delivered", "Declined", "Hold"] as const;
  ```

- [ ] **Step 2: Edit `apps/dashboard/src/features/load/types/load.ts`**

  ```typescript
  // before
  export type LoadStatus = "Pending" | "Approved" | "ApprovedPaid" | "Denied" | "Hold";

  // after
  export type LoadStatus = "Pending" | "Approved" | "Delivered" | "Declined" | "Hold";
  ```

- [ ] **Step 3: Edit `apps/dashboard/src/features/load/components/useLoadColumns.tsx`**

  Find the `statusColors` record and rename the two keys:

  ```typescript
  // before
  ApprovedPaid: "cyan",
  Denied: "red",

  // after
  Delivered: "cyan",
  Declined: "red",
  ```

- [ ] **Step 4: Edit `apps/dashboard/src/features/load/components/LoadManagementTable.tsx`**

  Find the status filter options array and update:

  ```typescript
  // before
  { label: "Approved Paid", value: "ApprovedPaid" },
  { label: "Denied", value: "Denied" },

  // after
  { label: "Delivered", value: "Delivered" },
  { label: "Declined", value: "Declined" },
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/db/src/schema/load.ts \
           apps/dashboard/src/features/load/types/load.ts \
           apps/dashboard/src/features/load/components/useLoadColumns.tsx \
           apps/dashboard/src/features/load/components/LoadManagementTable.tsx
  git commit -m "refactor(load): rename Denied→Declined, ApprovedPaid→Delivered in status enum"
  ```

---

## Task 2: Data migration — rename existing rows

`loadStatusValues` is a TypeScript type annotation on a plain TEXT column — drizzle-kit generates no DDL for this change. We create a data migration manually and register it in the journal.

**Files:**
- Create: `packages/db/drizzle/0010_rename_load_statuses.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`

- [ ] **Step 1: Create `packages/db/drizzle/0010_rename_load_statuses.sql`**

  ```sql
  UPDATE "load" SET "status" = 'Declined' WHERE "status" = 'Denied';
  --> statement-breakpoint
  UPDATE "load" SET "status" = 'Delivered' WHERE "status" = 'ApprovedPaid';
  ```

- [ ] **Step 2: Register the migration in `packages/db/drizzle/meta/_journal.json`**

  Append to the `"entries"` array (keep all existing entries, add this at the end):

  ```json
  {
    "idx": 10,
    "version": "7",
    "when": 1747052400000,
    "tag": "0010_rename_load_statuses",
    "breakpoints": true
  }
  ```

- [ ] **Step 3: Verify journal is valid JSON**

  ```bash
  python3 -c "import json; json.load(open('packages/db/drizzle/meta/_journal.json')); print('OK')"
  ```

  Expected: `OK`

- [ ] **Step 4: Commit**

  ```bash
  git add packages/db/drizzle/0010_rename_load_statuses.sql packages/db/drizzle/meta/_journal.json
  git commit -m "feat(db): migrate Denied→Declined, ApprovedPaid→Delivered in load status rows"
  ```

---

## Task 3: Write failing tests for the state machine

**Files:**
- Create: `packages/core/src/load/status-machine.test.ts`

- [ ] **Step 1: Create `packages/core/src/load/status-machine.test.ts`**

  ```typescript
  import { describe, expect, it } from "vitest";
  import {
    InvalidTransitionError,
    assertValidTransition,
    getAllowedTransitions,
    isValidTransition,
  } from "./status-machine.js";

  describe("isValidTransition — allowed transitions", () => {
    it.each([
      ["Pending", "Approved"],
      ["Pending", "Hold"],
      ["Pending", "Declined"],
      ["Pending", "Delivered"],
      ["Approved", "Hold"],
      ["Approved", "Declined"],
      ["Approved", "Delivered"],
      ["Hold", "Approved"],
      ["Delivered", "Hold"],
    ] as const)("allows %s → %s", (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });
  });

  describe("isValidTransition — forbidden transitions", () => {
    it.each([
      ["Hold", "Pending"],
      ["Declined", "Pending"],
      ["Declined", "Approved"],
      ["Delivered", "Approved"],
      ["Pending", "Pending"],
    ] as const)("forbids %s → %s", (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  });

  describe("getAllowedTransitions", () => {
    it("Pending → Approved, Hold, Declined, Delivered", () => {
      expect(getAllowedTransitions("Pending").sort()).toEqual(
        ["Approved", "Declined", "Delivered", "Hold"],
      );
    });

    it("Approved → Hold, Declined, Delivered", () => {
      expect(getAllowedTransitions("Approved").sort()).toEqual(
        ["Declined", "Delivered", "Hold"],
      );
    });

    it("Hold → Approved only", () => {
      expect(getAllowedTransitions("Hold")).toEqual(["Approved"]);
    });

    it("Delivered → Hold only", () => {
      expect(getAllowedTransitions("Delivered")).toEqual(["Hold"]);
    });

    it("Declined is terminal — no allowed transitions", () => {
      expect(getAllowedTransitions("Declined")).toEqual([]);
    });
  });

  describe("can never return to Pending invariant", () => {
    it.each(["Approved", "Hold", "Declined", "Delivered"] as const)(
      "%s cannot transition to Pending",
      (status) => {
        expect(getAllowedTransitions(status)).not.toContain("Pending");
      },
    );
  });

  describe("assertValidTransition", () => {
    it("throws InvalidTransitionError for forbidden transitions", () => {
      expect(() => assertValidTransition("Declined", "Pending")).toThrow(InvalidTransitionError);
    });

    it("error carries from, to, allowed, and code fields", () => {
      try {
        assertValidTransition("Declined", "Approved");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError);
        const e = err as InvalidTransitionError;
        expect(e.from).toBe("Declined");
        expect(e.to).toBe("Approved");
        expect(e.allowed).toEqual([]);
        expect(e.code).toBe("invalid_transition");
      }
    });

    it("does not throw for valid transitions", () => {
      expect(() => assertValidTransition("Pending", "Approved")).not.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run tests — expect failures**

  ```bash
  pnpm --filter @twy/core exec vitest run src/load/status-machine.test.ts
  ```

  Expected: multiple failures (imports don't resolve, `getAllowedTransitions` doesn't exist, old transitions still present).

- [ ] **Step 3: Commit the test file**

  ```bash
  git add packages/core/src/load/status-machine.test.ts
  git commit -m "test(load): add failing state machine tests for TWY-13"
  ```

---

## Task 4: Implement updated state machine

**Files:**
- Modify: `packages/core/src/load/status-machine.ts`

- [ ] **Step 1: Replace the full file content**

  ```typescript
  import type { LoadStatus } from "@twy/db";

  type Transition = [from: LoadStatus, to: LoadStatus];

  const TRANSITIONS: Transition[] = [
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

  export class InvalidTransitionError extends Error {
    readonly code = "invalid_transition" as const;

    constructor(
      readonly from: LoadStatus,
      readonly to: LoadStatus,
      readonly allowed: LoadStatus[],
    ) {
      super(`Cannot transition load status from "${from}" to "${to}"`);
      this.name = "InvalidTransitionError";
    }
  }

  export const isValidTransition = (from: LoadStatus, to: LoadStatus): boolean =>
    TRANSITIONS.some(([f, t]) => f === from && t === to);

  export const getAllowedTransitions = (from: LoadStatus): LoadStatus[] =>
    TRANSITIONS.filter(([f]) => f === from).map(([, t]) => t);

  export const assertValidTransition = (from: LoadStatus, to: LoadStatus): void => {
    if (!isValidTransition(from, to)) {
      throw new InvalidTransitionError(from, to, getAllowedTransitions(from));
    }
  };
  ```

- [ ] **Step 2: Run tests — expect all green**

  ```bash
  pnpm --filter @twy/core exec vitest run src/load/status-machine.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/core/src/load/status-machine.ts
  git commit -m "feat(load): implement state machine with renamed statuses, getAllowedTransitions, InvalidTransitionError"
  ```

---

## Task 5: Fix `financialsLockedAt` reference in repository

**Files:**
- Modify: `packages/core/src/load/repository.ts` (line 583)

- [ ] **Step 1: Update the financialsLockedAt condition**

  Find the line containing `"ApprovedPaid"` in `changeLoadStatus` and change it:

  ```typescript
  // before
  : status === "Approved" || status === "ApprovedPaid"
    ? { financialsLockedAt: new Date() }

  // after
  : status === "Approved" || status === "Delivered"
    ? { financialsLockedAt: new Date() }
  ```

- [ ] **Step 2: Build `@twy/core` to confirm no TypeScript errors**

  ```bash
  pnpm --filter @twy/core build
  ```

  Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/core/src/load/repository.ts
  git commit -m "fix(load): update financialsLockedAt lock condition for renamed Delivered status"
  ```

---

## Task 6: Update `jsonErrorHandler` to forward extra properties

The middleware currently only serialises `message` from http-errors instances. We extend it to include any non-standard own-enumerable properties (e.g. `code`, `from`, `to`, `allowed` added via `Object.assign`).

**Files:**
- Modify: `packages/functions/src/shared/middy/jsonErrorHandler.ts`

- [ ] **Step 1: Replace the `isHttpError` branch**

  ```typescript
  import type { MiddlewareObj } from "@middy/core";
  import type { APIGatewayProxyResult } from "aws-lambda";
  import { isHttpError } from "http-errors";

  const SKIP_PROPS = new Set(["statusCode", "status", "expose", "message", "name", "stack"]);

  export const jsonErrorHandler = (): MiddlewareObj => ({
    onError: async (request): Promise<APIGatewayProxyResult> => {
      const { error } = request;

      let statusCode = 500;
      let response: Record<string, unknown> = {};

      if (isHttpError(error)) {
        statusCode = error.statusCode ?? 400;

        const extras = Object.fromEntries(
          Object.entries(error as Record<string, unknown>).filter(([k]) => !SKIP_PROPS.has(k)),
        );

        try {
          const parsed = JSON.parse(error.message);
          response =
            typeof parsed === "object" && parsed !== null
              ? { ...parsed, ...extras }
              : { message: error.message, ...extras };
        } catch {
          response = { message: error.message, ...extras };
        }
      } else {
        const message = error instanceof Error ? error.message : "Internal server error";
        response = { message };
        console.error({
          name: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
          cause: error instanceof Error ? (error as Error & { cause?: unknown }).cause : error,
        });
      }

      return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      };
    },
  });
  ```

- [ ] **Step 2: Build `@twy/functions` to confirm no TypeScript errors**

  ```bash
  pnpm --filter @twy/functions build
  ```

  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/functions/src/shared/middy/jsonErrorHandler.ts
  git commit -m "feat(functions): forward extra http-error properties in jsonErrorHandler response"
  ```

---

## Task 7: Catch `InvalidTransitionError` in the `changeStatus` handler

**Files:**
- Modify: `packages/functions/src/api/load/changeStatus.ts`

- [ ] **Step 1: Replace the full file**

  ```typescript
  import { middyfy } from "@shared/index";
  import type { ChangeLoadStatusResponse } from "@twy/core";
  import {
    InvalidTransitionError,
    assertPermission,
    type ChangeLoadStatusEvent,
    ChangeLoadStatusEventSchema,
    changeLoadStatus as changeLoadStatusRecord,
    loadAuthContext,
  } from "@twy/core";
  import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
  import createError from "http-errors";

  const changeLoadStatus = async (
    event: ChangeLoadStatusEvent,
  ): Promise<ChangeLoadStatusResponse> => {
    const changedBy = event.requestContext.authUser.userId;
    const ctx = await loadAuthContext(changedBy);
    assertPermission(ctx, "loads", "edit");

    const { loadId } = event.pathParameters;
    const { status, isChargable = false, chargeAmount = null } = event.body;

    try {
      const { updated } = await changeLoadStatusRecord(
        loadId,
        status,
        changedBy,
        isChargable,
        chargeAmount ?? null,
      );

      if (!updated) {
        throw new createError.NotFound("Load not found");
      }
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

    return {
      message: "Load status updated successfully",
      loadId,
      status,
    };
  };

  export const handler = middyfy<
    ChangeLoadStatusEvent,
    ChangeLoadStatusResponse,
    APIGatewayProxyEventV2WithJWTAuthorizer
  >(changeLoadStatus, {
    eventSchema: ChangeLoadStatusEventSchema,
    mode: "parse",
  });
  ```

- [ ] **Step 2: Build `@twy/functions`**

  ```bash
  pnpm --filter @twy/functions build
  ```

  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/functions/src/api/load/changeStatus.ts
  git commit -m "feat(load): return structured invalid_transition error from changeStatus handler"
  ```

---

## Task 8: UI — status machine util + update `StatusUpdateModal`

**Files:**
- Create: `apps/dashboard/src/features/load/utils/statusMachine.ts`
- Modify: `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx`

- [ ] **Step 1: Create `apps/dashboard/src/features/load/utils/statusMachine.ts`**

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

- [ ] **Step 2: Update `StatusUpdateModal.tsx`**

  Replace the hardcoded `STATUS_OPTIONS` constant and the `<Form.Item name="status">` section.

  Remove lines:
  ```typescript
  const STATUS_OPTIONS = [
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Hold", label: "Hold" },
    { value: "Denied", label: "Denied" },
  ];
  ```

  Add import at the top of the file (alongside existing imports):
  ```typescript
  import { getAllowedTransitions } from "@/features/load/utils/statusMachine";
  ```

  Inside the component, replace the hardcoded options derivation before the `return`:
  ```typescript
  const allowedStatuses = getAllowedTransitions(load.status);
  const statusOptions = allowedStatuses.map((s) => ({ value: s, label: s }));
  const isTerminal = allowedStatuses.length === 0;
  ```

  Replace the Modal body — when `isTerminal` is true show an info message instead of the form:

  ```tsx
  {isTerminal ? (
    <p style={{ color: "var(--ant-color-text-secondary)" }}>
      This load is in a terminal state and cannot be transitioned further.
    </p>
  ) : (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: load.status,
          isChargable: load.isChargable ?? false,
          chargeAmount: load.chargeAmount ?? null,
        }}
      >
        <Form.Item name="status" label="New Status">
          <Select
            options={statusOptions}
            onChange={(v) => {
              if (v !== "Approved") {
                form.setFieldsValue({ isChargable: false, chargeAmount: null });
              }
            }}
          />
        </Form.Item>

        {selectedStatus === "Approved" && (
          <>
            <Form.Item name="isChargable" valuePropName="checked">
              <Checkbox
                onChange={(e) => {
                  if (!e.target.checked) form.setFieldValue("chargeAmount", null);
                }}
              >
                Is Chargable
              </Checkbox>
            </Form.Item>

            {isChargable && (
              <Form.Item name="chargeAmount" label="Charge Amount">
                <InputNumber
                  min={0}
                  precision={2}
                  prefix="€"
                  style={{ width: "100%" }}
                  placeholder="Enter charge amount"
                />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </>
  )}
  ```

  Also update the Modal `footer` — hide the Update button when terminal:
  ```tsx
  footer={
    <Space>
      <Button onClick={onCancel}>Cancel</Button>
      {!isTerminal && (
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Update Status
        </Button>
      )}
    </Space>
  }
  ```

  Update `statusColors` — rename the old keys:
  ```typescript
  const statusColors: Record<LoadStatus, string> = {
    Pending: "gold",
    Approved: "green",
    Delivered: "cyan",
    Declined: "red",
    Hold: "orange",
  };
  ```

- [ ] **Step 3: Build the dashboard to confirm no TypeScript errors**

  ```bash
  pnpm --filter @twy/dashboard build
  ```

  Expected: exits 0.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/dashboard/src/features/load/utils/statusMachine.ts \
           apps/dashboard/src/features/load/components/StatusUpdateModal.tsx
  git commit -m "feat(dashboard): filter status options by allowed transitions, add terminal-state message"
  ```

---

## Task 9: Full verification

- [ ] **Step 1: Run lint + build + test**

  ```bash
  pnpm check:ci && pnpm build && pnpm test
  ```

  Expected: exits 0, all tests pass.

- [ ] **Step 2: Apply migration to dev**

  ```bash
  pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
  ```

  Expected: `0010_rename_load_statuses` applied; no errors.

- [ ] **Step 3: Verify no rows remain with old status values**

  Run in `sst shell --stage dev`:
  ```bash
  pnpm sst shell --stage dev -- node -e "
    const { db, load } = await import('@twy/db');
    const rows = await db.select({ status: load.status }).from(load);
    const bad = rows.filter(r => r.status === 'Denied' || r.status === 'ApprovedPaid');
    console.log('Stale rows:', bad.length);
  "
  ```

  Expected: `Stale rows: 0`
