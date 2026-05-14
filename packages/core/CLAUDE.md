# packages/core — `@twy/core`

Runtime-agnostic business logic — domain schemas (Zod), repositories (Drizzle queries), and services (S3, formatters). The middle layer between `@twy/db` (raw schema/client) and `@twy/functions` (Lambda handlers).

> Read root `CLAUDE.md` first. This file is the core-specific delta.

## Layout

```
packages/core/
├── src/
│   ├── user/                    Domain bundle: schema + repository + barrel
│   │   ├── repository.ts        Drizzle queries (createUser, listUsers, …)
│   │   ├── request.ts           Zod request schemas
│   │   ├── response.ts          Zod response schemas + TS response types
│   │   └── index.ts             Re-exports the three above
│   ├── branch/                  (same shape)
│   ├── load/                    (same shape)
│   ├── file/                    Schemas + service (S3 presigned URLs, owned deletes, batch cleanup)
│   │   ├── constants.ts request.ts response.ts service.ts index.ts
│   ├── shared/                  Cross-domain helpers
│   │   ├── auth.ts              Common auth Zod schema
│   │   ├── response.ts          MessageResponse + base envelope schemas
│   │   ├── formatters.ts        Date/string formatters
│   │   └── index.ts
│   └── index.ts                 Root barrel — what consumers import
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## Dependency direction (one-way)

```
@twy/functions  →  @twy/core  →  @twy/db
```

- **`@twy/functions` consumes `@twy/core`** for all schemas, repositories and services. Handlers stay thin.
- **`@twy/core` consumes `@twy/db`** for the Drizzle client and table definitions only. Repositories own query composition.
- **`@twy/core` MUST NOT import from `@twy/functions`** — that would couple business logic to Lambda runtime concerns. No `aws-lambda`, no `@middy/*`, no `Resource.X` reads in this package.

## Public surface

`packages/core/src/index.ts` is a barrel that re-exports every domain plus shared. Consumers do:

```typescript
import {
  // schemas
  GetUserEventSchema,
  type GetUserEvent,
  type UserResponse,
  // repositories
  getFullUserInfoById,
  createUser,
  // services
  createUploadUrl,
  // shared
  type MessageResponse,
  formatDate,
  // re-exported db enums
  Roles,
  type LoadStatus,
  loadStatusValues,
} from "@twy/core";
```

The schema enums (`Roles`, `LoadStatus`, `OrderDirection`, `loadStatusValues`) and `PERMISSION_REGISTRY` (plus `PermissionEntity`, `PermissionAction` types) live in `@twy/db`'s schema and are re-exported here for ergonomics — callers never need to know which package owns them.

## File domain (`file/`)

The single source of truth for S3 lifecycle. Three service entry points consumers should know about:

| Function | Purpose | Authorization |
|---|---|---|
| `createUploadUrl({ fileName, contentType, size, uploadedByUserId, documentCategory? })` | Inserts the `file` row, returns a 15-min presigned PUT URL. `documentCategory` (optional, enum from `@twy/db`) is persisted on the row. | Caller's `userId` becomes `file.created_by` — used for later attach + delete authorization. |
| `deleteOwnedFile({ fileId, callerUserId })` | Removes the DB row **and** the S3 object. Throws `NotFound` if the caller is not the uploader (silent, no-info leak). Throws `Conflict` if a junction row still references the file. | `created_by = callerUserId`. |
| `batchDeleteFiles({ fileIds, callerUserId })` | Best-effort cleanup used by the dashboard on form cancel. Silently skips ids the caller does not own or that are still linked (FK restrict). Returns the list it actually deleted. | Same caller scope. |
| `deleteFile(fileId)` | Low-level S3-only delete. Does **not** check ownership and does **not** touch the DB row. Reserved for inside this package — e.g. `office-expense-payment-order/repository.ts` calls it after manually unlinking + checking refcount. | None — internal only. |

Constants live in `packages/core/src/file/constants.ts` (`MAX_UPLOAD_FILE_SIZE_BYTES`, `MAX_BATCH_DELETE_FILE_IDS`) and are mirrored in `apps/dashboard/src/features/files/constants.ts` via a "KEEP IN SYNC" comment header in both files.

## Adding a new domain

1. `packages/core/src/<domain>/{repository,request,response}.ts` (mirror an existing domain).
2. `packages/core/src/<domain>/index.ts` re-exports the three.
3. Add `export * from "./<domain>/index.js";` to `packages/core/src/index.ts`.
4. Schema lives in `@twy/db` (`packages/db/src/schema/<domain>.ts`) — repositories import from `@twy/db`, never inline raw SQL.

## Build

```bash
pnpm --filter @twy/core build       # tsc → dist/
```

CI builds this automatically before `@twy/functions` (Turbo `^build`).

## What does NOT live here

- Lambda handlers (`@twy/functions`).
- Middy middleware (`@twy/functions/src/shared/`).
- Drizzle schema or migrations (`@twy/db`).
- React or browser code (`@twy/dashboard`, `@twy/web`).
