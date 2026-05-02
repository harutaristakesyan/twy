# apps/functions — `@twy/functions`

Domain Lambdas (user, branch, file, load) + the Cognito post-confirmation trigger. JWT-authenticated via the shared HttpApi declared in **`infra/api.ts`**. This is the workhorse package — most new endpoints belong here, not in `@twy/auth`.

All database access (schema, queries, migrations) lives in `@twy/db` (see `packages/db/CLAUDE.md`). This package only consumes it.

> Read root `CLAUDE.md` first. This file is the functions-app-specific delta.

## Layout

```
apps/functions/
├── src/
│   ├── contracts/<domain>/{request,response}.ts   # Zod schemas + TS types
│   ├── functions/
│   │   ├── postConfirmation.ts                    # Cognito trigger, wired in infra/auth.ts
│   │   └── <domain>/{get,list,update,delete,...}.ts  # JWT-protected handlers
│   ├── libs/
│   │   └── s3/{fileStorage,index}.ts              # presigned URL helpers (Resource.Files)
│   └── utils/
└── tsconfig.{json,paths,scripts}.json
```

`tsconfig.paths.json` defines `@contracts/*`, `@functions/*`, `@libs/*`, `@utils/*` aliases. Use them in source files. The `@libs/db/*` alias is gone — use `@twy/db` instead.

`tsconfig.scripts.json` is loosened so `tsx` can run admin scripts (currently no scripts live in this app — kept for future use).

## Adding a handler

Use `/new-handler <METHOD> <PATH>` or the `lambda-handler-author` subagent. The shape:

1. Add the Zod schema to `src/contracts/<domain>/request.ts`.
2. Add the response type to `src/contracts/<domain>/response.ts`.
3. Write the handler in `src/functions/<domain>/<verb>.ts` using `middyfy`. Read configuration from `Resource.X`, **not** from `process.env` or `requireEnv`.
4. Append a `RouteDef` entry to `infra/routes.ts` `appRoutes` with `requiresAuth: true` (almost always) and the `linkKeys` your handler needs.
5. If the handler needs a new DB query, add it to `packages/db/src/operations/<domain>Operations.ts` and re-export it via `packages/db/src/index.ts`. Handlers should import the operation from `@twy/db`, not write inline Drizzle queries.

## Authorization

Every domain handler MUST scope its queries by `event.requestContext.authUser.userId`. Aurora has no row-level security wired up — multi-tenant isolation is the application's job. The `security-auditor` subagent checks this on every PR review.

## DB usage from a handler

```typescript
import { listLoads } from "@twy/db";

const loads = await listLoads({ ownerId: userId });
```

Operation functions encapsulate query composition. Reach for raw `db` / `eq` / `and` from `@twy/db` only when factoring a new operation; commit that operation back into `@twy/db`.

For migration workflow (schema edits, `db:generate`, `migrate`) see `packages/db/CLAUDE.md`.

## Resource SDK reads

| Resource | Provided by | Used for |
|---|---|---|
| `Resource.Cluster.{clusterArn,secretArn,database}` | `infra/database.ts` (`db.cluster`) | Consumed by `@twy/db` — handlers never read this directly |
| `Resource.UserPool.id` | `infra/auth.ts` | `AdminUpdateUserAttributesCommand`, `AdminEnable/Disable/DeleteUserCommand` in user/* handlers |
| `Resource.Files.name` | `infra/storage.ts` | S3 PUT/GET/DELETE presigned URLs in `libs/s3/fileStorage.ts` |

The route-side `linkKeys: ["cluster", ...]` in `infra/routes.ts` is what grants the handler the IAM permissions and Resource bindings transitively used by `@twy/db`.

## Errors

Throw `http-errors` instances. The `jsonErrorHandler` middleware (auto-added by `middyfy`) converts them to JSON responses. Don't return `{ statusCode: 500 }` manually.

```typescript
import errors from "http-errors";

if (!user) throw new errors.NotFound(`user ${id} not found`);
if (user.role !== "admin") throw new errors.Forbidden("admin only");
```

## Build & test

```bash
pnpm --filter @twy/functions build
pnpm --filter @twy/functions exec vitest run path/to/file.test.ts
```

Turbo's `^build` ensures `@twy/db` and `@twy/lambda-shared` are built first.

## Deploy

```bash
pnpm sst deploy --stage dev
```

CI runs `sst deploy` first, then the `@twy/db` migration step in the same job. There is no per-app `synth/diff/deploy` script anymore.
