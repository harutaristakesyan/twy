# Fix intermittent "Failed query: …" on `changeLoadStatus` (Aurora Data API tx race)

## Context

Symptoms reported by the user (in **both prod and dev**, cluster healthy):

1. `PATCH /api/load/:id/status` intermittently returns:
   ```json
   { "message": "Failed query: update \"load\" set \"is_chargable\" = :1, \"charge_amount\" = :2, \"status\" = :3, \"status_changed_by\" = :4, \"updated_at\" = :5 where \"load\".\"id\" = :6 returning \"id\"\nparams: false,,Pending,...,2026-05-04T20:38:54.370Z,..." }
   ```
2. Or:
   ```json
   { "message": "Failed query: select \"email\" from \"users\" where \"users\".\"id\" = :1\nparams: ..." }
   ```
3. Retrying 10 s – 1 min later succeeds — same payload, same code, no infra change.

## Root cause

`packages/core/src/load/repository.ts:435-464` — `changeLoadStatus` opens a Drizzle
transaction and fires **two `tx.*` statements concurrently** via `Promise.all`:

```ts
db.transaction(async (tx) => {
  const [updateResult, userRow] = await Promise.all([
    tx.update(load).set({...}).where(eq(load.id, loadId)).returning({ id: load.id }),
    tx.select({ email: users.email }).from(users).where(eq(users.id, changedBy)),
  ]);
  ...
});
```

Aurora Serverless v2's **RDS Data API serialises `ExecuteStatement` calls per
`transactionId`** — only one statement may be in flight per transaction at a
time. Two parallel calls on the same `transactionId` create a race: the second
arrival is rejected by the Data API with `BadRequestException: Transaction
<id> is not in a state that can accept this statement`. Drizzle's
aws-data-api driver wraps this as `Error("Failed query: <sql>\nparams: ...")`,
discarding the underlying SDK message into `error.cause`. Whichever statement
loses the race is the one the user sees in the response — exactly matching the
two SQL strings reported. Whether the race fires depends on Node microtask
order, TLS keep-alive state, network jitter, and current cluster ACU level — so
it's intermittent and indifferent to which environment you're in. Reproducing
in tests doesn't happen because local mocks don't simulate the Data API's
per-transaction serialisation rule.

The symptom has nothing to do with auto-pause, ACU scaling, or any infra; it's
a code race that surfaces in any healthy cluster under realistic timing.

## Fix

### 1. Remove the dead `users.email` lookup entirely

The user-email returned as `statusChangedBy: statusChangedByEmail` in the
response is **not consumed anywhere** in the UI:

- `apps/dashboard/src/features/load/components/StatusUpdateModal.tsx:56-67` —
  calls `loadApi.changeStatus(...)` and only reads its thrown error. The
  resolved value (and therefore `statusChangedBy`) is ignored.
- No other consumer of `ChangeLoadStatusResponse` exists.

Removing the email query both eliminates the transaction race and deletes
genuinely dead code.

**Files:**

- `packages/core/src/load/repository.ts` — Replace `changeLoadStatus` with a
  single update outside any transaction. Return only `{ updated: boolean }`.
  Drop the `users` import if it's no longer used elsewhere in the file.

  ```ts
  export const changeLoadStatus = async (
    loadId: string,
    status: LoadStatus,
    changedBy: string,
    isChargable: boolean,
    chargeAmount: number | null,
  ): Promise<{ updated: boolean }> => {
    const result = await db
      .update(load)
      .set({
        status,
        statusChangedBy: changedBy,
        isChargable,
        chargeAmount: isChargable && chargeAmount != null ? chargeAmount.toString() : null,
        updatedAt: new Date(),
      })
      .where(eq(load.id, loadId))
      .returning({ id: load.id });
    return { updated: result.length > 0 };
  };
  ```

  Single statement, no transaction needed (atomicity of one `UPDATE` is
  inherent). No race possible.

- `packages/core/src/load/response.ts:46-50` — Drop the
  `statusChangedBy: string | null` field from `ChangeLoadStatusResponse`.

- `packages/functions/src/api/load/changeStatus.ts:13-41` — Stop destructuring
  `statusChangedByEmail` from the repository result; stop putting
  `statusChangedBy` into the response payload.

- `apps/dashboard/src/features/load/api/loadApi.ts:19-23` — Drop the
  `statusChangedBy: string | null` field from the `ChangeStatusResponse`
  interface.

(`statusChangedBy` on `LoadResponse` and the `load` table column itself
**stay** — they're the userId persisted on the load row, written by this same
update, and remain part of `GET /loads`. We're only removing the email
*lookup* in the response of `PATCH /loads/:id/status`.)

### 2. Audit other places for the same pattern (global rule)

Grep (`Promise.all` across `packages/core` and `packages/functions`):

| Location | Inside `db.transaction(tx => ...)`? | Verdict |
|---|---|---|
| `packages/core/src/load/repository.ts:273` (listLoads) | No — uses `db.*` | Safe |
| `packages/core/src/load/repository.ts:443` (changeLoadStatus) | **Yes — uses `tx.*`** | **Bug — fix above** |
| `packages/core/src/branch/repository.ts:101` | No — uses `db.*` | Safe |
| `packages/core/src/broker-request/repository.ts:134` | No | Safe |
| `packages/core/src/carrier-request/repository.ts:128` | No | Safe |
| `packages/core/src/carrier/repository.ts:117` | No | Safe |
| `packages/core/src/outside-broker/repository.ts:114` | No | Safe |
| `packages/core/src/team/repository.ts:162,195,217,234,294,335,417` | All use `db.*` (the `162` one is a `Promise.allSettled` of separate `db` round-trips) | Safe |
| `packages/core/src/user/repository.ts:131` | No | Safe |
| `packages/core/src/auth-context/rebuild.ts:13` | No (parallel `rebuildAuthContext` calls, each opens its own work) | Safe |

**Conclusion:** the only occurrence of `Promise.all([tx.X, tx.Y])` in the entire
codebase is the one in `changeLoadStatus`. After removing the email lookup,
zero unsafe parallel-tx patterns remain.

### 3. Document the rule so this never recurs

Add a short note to `packages/db/CLAUDE.md` under "Pitfalls":

> **Never run `Promise.all([tx.X, tx.Y, ...])` inside `db.transaction(...)`.**
> Aurora Serverless v2's RDS Data API serialises statements per
> `transactionId` — only one `ExecuteStatement` may be in flight at a time.
> Parallel calls on the same `tx` are rejected with `BadRequestException` and
> Drizzle re-throws as a generic `Failed query: …`. Use sequential `await`s
> on `tx.*`, or fan out on `db.*` outside the transaction when the calls
> aren't part of the atomic boundary.

### 4. Surface real cause for the future

`packages/functions/src/shared/middy/jsonErrorHandler.ts:23-26` currently
returns only `error.message`. Add a `console.error` of `error.name` and
`(error as Error & { cause?: unknown }).cause` before composing the response
(don't change the response body itself). Next time a Data API rejection
slips through, CloudWatch will show the underlying
`BadRequestException: ...` instead of the wrapped Drizzle string.

## Files to modify

| File | Change |
|---|---|
| `packages/core/src/load/repository.ts` | Replace `changeLoadStatus` body — single non-transactional UPDATE, no users.email read. Return type → `{ updated: boolean }`. |
| `packages/core/src/load/response.ts` | Drop `statusChangedBy` field from `ChangeLoadStatusResponse`. |
| `packages/functions/src/api/load/changeStatus.ts` | Destructure only `{ updated }`; remove `statusChangedBy` from response payload. |
| `apps/dashboard/src/features/load/api/loadApi.ts` | Drop `statusChangedBy` from `ChangeStatusResponse` interface. |
| `packages/functions/src/shared/middy/jsonErrorHandler.ts` | Log `error.name` + `error.cause` server-side (response body unchanged). |
| `packages/db/CLAUDE.md` | Add the "no `Promise.all([tx.X, tx.Y])`" pitfall paragraph. |

No schema changes. No migration. No infra changes. No new dependencies.

## Verification

1. `pnpm --filter @twy/core build` — TS compiles after dropping the field.
2. `pnpm --filter @twy/functions build` — handler typechecks against the new
   repository signature and the trimmed `ChangeLoadStatusResponse`.
3. `pnpm --filter @twy/dashboard build` — UI types resolve after dropping
   `statusChangedBy` from `ChangeStatusResponse`.
4. `pnpm test` — full Turbo test pipeline.
5. Manual: deploy to dev, hit `PATCH /api/load/:id/status` 20× rapidly
   against the same load. With the old code at least one in ~10 fails; with
   the fix, all should succeed.
6. `/verify` then `/ship`.

## Out of scope

- The Drizzle lazy proxy in `packages/db/src/client.ts` — unrelated, working
  as designed.
- Aurora ACU scaling settings in `infra/database.ts` — unrelated.
- Other repositories' `Promise.all` calls (audited above — all safe).
