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
│   ├── file/                    Schemas + service (S3 presigned URLs)
│   │   ├── request.ts response.ts service.ts index.ts
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

The schema enums (`Roles`, `LoadStatus`, `OrderDirection`, `loadStatusValues`) live in `@twy/db`'s schema and are re-exported here for ergonomics — callers never need to know which package owns them.

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
