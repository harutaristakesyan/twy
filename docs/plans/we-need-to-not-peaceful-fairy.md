# Decouple DB user ID from Cognito `sub` + remove custom UUID regex

## Context

Today the user identity flows like this:

1. A user signs up; Cognito issues a `sub` (which is, in fact, a v4 UUID).
2. `events/postConfirmation.ts` inserts a row into `users` with `id = userAttributes.sub`.
3. The JWT middleware (`packages/functions/src/shared/middy/httpJwtExtractor.ts`) reads `claims.sub` and stores it as `event.requestContext.authUser.userId`.
4. Every handler scopes its queries by that `userId`. Every Cognito admin call (`AdminEnableUser`, `AdminDisableUser`, `AdminDeleteUser`) also passes that same value as `Username`.

This couples the DB identity to the auth provider. We want:
- A DB-owned UUID (`crypto.randomUUID()`) as the primary key on `users`.
- Cognito stores that UUID as a custom attribute (`custom:appUserId`).
- A **PreTokenGeneration V2** Lambda promotes it onto the **access token** as a top-level claim `app_user_id`.
- The JWT middleware reads `claims.app_user_id` (validated as `z.uuid()`) instead of `claims.sub`.
- All custom `UUID_REGEX` validators across the codebase get replaced by Zod's built-in `z.uuid()`.

User decisions:
- **Token type**: keep the access token; pay for Cognito **Essentials** feature tier so V2 trigger can edit access-token claims.
- **Backfill**: none — DB and user pool are empty; we restart from zero.
- **PR strategy**: single local change (no split PR).

## Files to touch

### 1. Cognito user pool — `infra/auth.ts`

Add a custom attribute, opt into the Essentials tier, and wire a V2 PreTokenGeneration trigger.

- Add a new `preTokenGeneration` Lambda entry under `triggers`. SST's surface emits V1 by default — we need V2, so use `transform.userPool.lambdaConfig.preTokenGenerationConfig: { lambdaArn: ..., lambdaVersion: "V2_0" }` as the escape hatch and remove the SST-managed `triggers.preTokenGeneration` shorthand. The new trigger Lambda needs `link: [args.db.cluster]` only if it reads from the DB; if it reads `custom:appUserId` straight off the user record (already in the trigger event), no DB link is required — keep it pure for cold-start latency.
- `transform.userPool.schema: [{ name: "appUserId", attributeDataType: "String", mutable: true }]` to declare the custom attribute.
- `transform.userPool.userPoolTier: "ESSENTIALS"` to enable V2 trigger event support.
- `transform.userPool.lambdaConfig.preTokenGenerationConfig.lambdaVersion: "V2_0"`.
- On `userPool.addClient(...)`, set `transform.client.writeAttributes` to the standard set **excluding** `custom:appUserId` — prevents end-users self-mutating their own app id via `UpdateUserAttributes`. Set `readAttributes` to include `custom:appUserId` so the dashboard can read it back if needed.
- Permissions for `postConfirmation`: add `cognito-idp:AdminUpdateUserAttributes` so it can write `custom:appUserId` after generating the UUID.

### 2. New PreTokenGen V2 Lambda — `packages/functions/src/events/preTokenGenerationV2.ts`

Reads `event.request.userAttributes["custom:appUserId"]` and emits `app_user_id` as a top-level claim on **access** and **id** tokens via the V2 response shape:

```ts
event.response = {
  claimsAndScopeOverrideDetails: {
    accessTokenGeneration: {
      claimsToAddOrOverride: { app_user_id: appUserId },
    },
    idTokenGeneration: {
      claimsToAddOrOverride: { app_user_id: appUserId },
    },
  },
};
```

If `custom:appUserId` is missing (shouldn't happen post-confirmation, but be defensive), log and return the event unmodified — the resulting token will lack the claim, the JWT middleware will reject the request, and the user will be forced to re-trigger the post-confirmation path.

### 3. PostConfirmation flow — `packages/functions/src/events/postConfirmation.ts`

Replace `const id = userAttributes.sub` with `const id = crypto.randomUUID()`. Then call `AdminUpdateUserAttributesCommand` with `UserAttributes: [{ Name: "custom:appUserId", Value: id }]` BEFORE the existing `AdminDisableUserCommand`. Then `createUser({ id, cognitoSub: userAttributes.sub, email, ... })`.

Order matters: if the DB write fails after the Cognito write, the user has a dangling `custom:appUserId` pointing at a non-existent DB row — this is recoverable on next admin action; a hard failure that doesn't insert the DB row but disables the Cognito user is preferable to one that creates an orphan.

### 4. Admin user create — `packages/functions/src/api/user/create.ts`

Lines 29-69 read the Cognito `sub` from `AdminCreateUser` and use it as the DB id. Change to:
- Generate `const newUserId = crypto.randomUUID()` first.
- After `AdminCreateUserCommand` succeeds and we have `subAttr`, call `AdminUpdateUserAttributesCommand` to set `custom:appUserId = newUserId`.
- `createUser({ id: newUserId, cognitoSub: subAttr, email, ... })`.
- The compensating `AdminDeleteUserCommand` on DB-write failure stays the same (still keyed by email which is the username alias).

### 5. Schema — `packages/db/src/schema/users.ts`

Add `cognitoSub: varchar({ length: 64 }).notNull().unique()` next to `email`. Then `pnpm sst shell --stage <yourstage> -- pnpm --filter @twy/db db:generate` to produce a new migration SQL (no manual SQL editing — Drizzle generates it). Since the DB is empty, the migration is straightforward `ADD COLUMN`.

### 6. Cognito-sdk admin calls keyed by `userId` — switch to email

These currently do `Username: userId` where `userId` was the Cognito sub. With the decoupling, `userId` is the DB UUID and is no longer a valid Cognito Username. Switch each to use `email` (which IS a valid Cognito Username because `usernames: ["email"]` is set on the pool):

- `packages/functions/src/api/user/update.ts:46, 53` — load the target row via `getUserById(userId)`, then pass `Username: row.email` to `AdminEnableUser` / `AdminDisableUser`.
- `packages/functions/src/api/user/delete.ts:39` — same pattern: load row, then `Username: row.email`.
- `packages/functions/src/api/user/self-update.ts:51` — load the caller's row, then `Username: row.email` for `AdminUpdateUserAttributes`.

Alternative: store `cognitoSub` and pass it as Username (Cognito accepts both alias and sub). Email is preferred because we already have it on the row via the typical SELECT and it's marginally more readable in logs. Keep `cognitoSub` on the schema regardless — useful for forensics and future migrations.

### 7. JWT middleware — `packages/functions/src/shared/middy/httpJwtExtractor.ts`

Replace the `claims.sub` read with `claims.app_user_id` (the V2 trigger emits this as a top-level claim). Validate it with Zod's UUID parser before trusting:

```ts
import { z } from "zod";
const claim = claims.app_user_id;
const parsed = z.uuid().safeParse(claim);
if (!parsed.success) {
  console.warn("⚠️ JWT app_user_id missing or not a UUID");
  return;
}
request.event.requestContext = {
  ...request.event.requestContext,
  authUser: { userId: parsed.data },
} as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"];
```

No fallback to `sub` — fresh DB means no legacy tokens to support.

### 8. AuthContext schema — `packages/core/src/shared/auth.ts`

Tighten `userId: z.string()` → `userId: z.uuid()`. Every handler that destructures `event.requestContext.authUser.userId` continues to work — only the runtime guard tightens.

### 9. Custom UUID regex removal — `packages/core/src/user/request.ts` and `packages/core/src/team/request.ts`

Following the style already established in `packages/core/src/branch/request.ts:68,78`:

- `user/request.ts:51` — delete the `UUID_REGEX` constant.
- `user/request.ts:55,56,66,76,104,105` — replace each `z.string().regex(UUID_REGEX, "<msg>")` with `z.uuid("<msg>")`. Keep the messages as-is.
- `team/request.ts:5` — delete the `UUID_REGEX` constant.
- `team/request.ts:6` — change `const uuidField = z.string().regex(UUID_REGEX, "Value must be a valid UUID")` → `const uuidField = z.uuid("Value must be a valid UUID")`. All 8 callers stay unchanged.

### 10. Secondary `z.string().uuid()` normalization (optional consistency pass)

These already validate UUIDs correctly but use the legacy chained form. Normalize to `z.uuid(...)` for codebase uniformity. Mechanical search-and-replace:

- `packages/core/src/outside-broker/request.ts:10`
- `packages/core/src/broker-request/request.ts:4`
- `packages/core/src/carrier-request/request.ts:15`
- `packages/core/src/load/request.ts:10`
- `packages/core/src/carrier/request.ts:20`
- `packages/core/src/file/request.ts:24,33` (two inline call sites)

### 11. Frontend JWT type — `apps/dashboard/src/utils/jwt.ts:4-9`

Extend the `JwtPayload` interface with `app_user_id?: string;`. Today the dashboard never reads `sub` and has no consumers of `app_user_id` either, but the type addition is forward-looking and zero-risk.

### 12. Routes wiring — `infra/routes.ts`

The PreTokenGen Lambda is a Cognito trigger, not an HTTP route, so no `routes.ts` change. It's wired in `infra/auth.ts`. Verify `linkKeys: ["userPool"]` is set on `appRoutes` for the user-admin handlers (already true for `user/{create,update,delete,self-update}.ts`).

## Key references reused

- `crypto.randomUUID()` — standard in Node 24 runtime, no dependency add.
- Existing `createUser` operation in `packages/core/src/user/repository.ts` — extend its Zod input to accept `cognitoSub`. The sole new field is straightforward.
- Existing `getUserById` / `getFullUserInfoById` (in `packages/core/src/user/repository.ts`) — used by the admin handlers in step 6 to look up email before each Cognito call.
- The V1 trigger pattern already in `infra/auth.ts:31-40` is the template for the new V2 trigger entry (just with the transform override for `lambdaVersion`).

## Verification

End-to-end smoke test, in order:

1. `pnpm --filter @twy/core build && pnpm --filter @twy/db build && pnpm --filter @twy/functions build` — package compilation.
2. `pnpm sst shell --stage <yourstage> -- pnpm --filter @twy/db db:generate` — generate migration; commit the new SQL + meta snapshot under `packages/db/drizzle/`.
3. `pnpm sst deploy --stage <yourstage>` — deploys the schema-updated Cognito pool, the new V2 trigger Lambda, and the updated handlers.
4. `pnpm sst shell --stage <yourstage> -- pnpm --filter @twy/db migrate` — applies the new column.
5. Sign up a new user via the dashboard. After confirmation:
   - In the AWS Console, on the Cognito user, confirm `custom:appUserId` is populated and is NOT equal to the user's `sub`.
   - In the DB, `SELECT id, cognito_sub FROM users WHERE email = '<new>';` — confirm `id` (the new UUID) ≠ `cognito_sub`.
6. Log in and call any JWT-protected endpoint (e.g., `GET /api/auth/me`). Decode the access token (e.g., jwt.io) and confirm the `app_user_id` claim is present and equals the DB `id`. Confirm the endpoint returns 200 and the response `user.id` matches the `app_user_id` claim.
7. As an admin user, exercise `PUT /api/user/<id>` to flip `isActive` and `DELETE /api/user/<id>` — confirm the Cognito user is correspondingly enabled/disabled/deleted (i.e., the email-based `Username` lookup works).
8. `/verify` (lint + build + test).

## Out of scope

- No backfill scripts (DB is empty).
- No multi-IdP federation work (no IdP linking, no `AdminLinkProviderForUser`).
- No `apps/web` changes (Astro static site, no auth).
- No frontend routing or `useAuth()` semantics changes — `authMe.user.id` continues to mean "this user's primary key", just sourced from a fresh UUID instead of `sub` going forward.
