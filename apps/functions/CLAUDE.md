# apps/functions — `@twy/functions`

Domain Lambdas (user, branch, file, load) + the Cognito post-confirmation trigger + Kysely migrations against Aurora DSQL. JWT-authenticated via the shared HttpApi declared in **`infra/api.ts`**. This is the workhorse package — most new endpoints belong here, not in `@twy/auth`.

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
│   │   ├── db/
│   │   │   ├── client.ts                 # Aurora DSQL + IAM connection (TTL cache, Resource.Cluster)
│   │   │   ├── index.ts                  # Database interface
│   │   │   ├── migration.ts              # runMigrations runner
│   │   │   ├── operations/<domain>Operations.ts
│   │   │   └── schema/<table>.ts         # Kysely table interfaces
│   │   └── s3/{fileStorage,index}.ts     # presigned URL helpers (Resource.Files)
│   ├── migration/
│   │   ├── run-migrations.ts             # entry script (pnpm migrate via tsx)
│   │   └── sql/V<n>__<name>.sql          # immutable applied migrations
│   └── utils/
└── tsconfig.{json,paths,scripts}.json
```

`tsconfig.paths.json` defines `@contracts/*`, `@functions/*`, `@libs/*`, `@utils/*` aliases. Use them in source files.

`tsconfig.scripts.json` is loosened so `tsx` can run the migration runner.

## Adding a handler

Use `/new-handler <METHOD> <PATH>` or the `lambda-handler-author` subagent. The shape:

1. Add the Zod schema to `src/contracts/<domain>/request.ts`.
2. Add the response type to `src/contracts/<domain>/response.ts`.
3. Write the handler in `src/functions/<domain>/<verb>.ts` using `middyfy`. Read configuration from `Resource.X`, **not** from `process.env` or `requireEnv`.
4. Append a `RouteDef` entry to `infra/routes.ts` `appRoutes` with `requiresAuth: true` (almost always) and the `linkKeys` your handler needs.
5. If the handler needs a new DB query, add it to `src/libs/db/operations/<domain>Operations.ts` with a typed `(db: Kysely<Database>, ...) => Promise<...>` signature for testability.

## Authorization

Every domain handler MUST scope its queries by `event.requestContext.authUser.userId`. Aurora DSQL has no row-level security automatically — multi-tenant isolation is the application's job. The `security-auditor` subagent checks this on every PR review.

## Adding a migration

Use `/new-migration <description>` or the `migration-writer` subagent. The hard rules (also encoded in `kysely-migration` skill and the pre-tool-use hook):

- New file under `src/migration/sql/V<n+1>__<snake>.sql`. Never edit applied migrations.
- Same commit must update `src/libs/db/schema/<table>.ts` and (for new tables) `src/libs/db/index.ts` `Database` interface.
- Apply against a stage: `pnpm sst shell --stage dev -- pnpm --filter @twy/functions migrate`. CI applies it after `sst deploy` succeeds.

## DB connection pattern

```typescript
import { getDb } from "@libs/db/client";

const db = await getDb();
const user = await db
  .selectFrom("users")
  .where("id", "=", userId)
  .selectAll()
  .executeTakeFirst();
```

`getDb()` reads `Resource.Cluster.host` + `Resource.Cluster.region` (provided by `link: [db.cluster]` in `infra/api.ts`), generates an IAM auth token via `@aws-sdk/dsql-signer`, and caches the pool for 10 minutes (DSQL IAM tokens last 15 min). Don't construct your own `Pool` or your own `Kysely` instance.

## Resource SDK reads

| Resource | Provided by | Used for |
|---|---|---|
| `Resource.Cluster.host` / `.region` | `infra/database.ts` (`db.cluster`) | DB connection in `libs/db/client.ts` |
| `Resource.UserPool.id` | `infra/auth.ts` | `AdminUpdateUserAttributesCommand`, `AdminEnable/Disable/DeleteUserCommand` in user/* handlers |
| `Resource.Files.name` | `infra/storage.ts` | S3 PUT/GET/DELETE presigned URLs in `libs/s3/fileStorage.ts` |

## SQL safety

- All Kysely queries use parameter binding — `.where("col", "=", value)` is safe.
- Tagged template `sql<T>\`... ${value} ...\`` is safe.
- `sql.raw(string)` is **NOT** safe with user input. The migration runner uses `sql.raw` on static file content — that's the only allowed use.

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

## Migrate & deploy

```bash
# Apply pending V*__*.sql against the cluster bound to a stage
pnpm sst shell --stage dev -- pnpm --filter @twy/functions migrate

# Deploy everything (functions + UI + auth + infra) to a stage
pnpm sst deploy --stage dev
```

CI runs `sst deploy` first, then the migration step in the same job. There is no per-app `synth/diff/deploy` script anymore.
