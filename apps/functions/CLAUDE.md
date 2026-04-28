# apps/functions — `@twy/functions`

Domain Lambdas (user, branch, file, load) + Kysely migrations against Aurora DSQL. JWT-authenticated via the shared HttpApi. This is the workhorse package — most new endpoints belong here, not in `@twy/auth`.

> Read root `CLAUDE.md` first. This file is the functions-app-specific delta.

## Layout

```
apps/functions/
├── bin/
│   ├── cdk.ts              # CDK app entry
│   ├── deploy.ts           # CDK deploy helper
│   └── functionStack.ts    # HttpLambdaRouter routes registry
├── src/
│   ├── contracts/<domain>/{request,response}.ts   # Zod schemas + TS types
│   ├── functions/<domain>/{get,list,update,delete,...}.ts  # handlers
│   ├── libs/
│   │   ├── db/
│   │   │   ├── client.ts                 # Aurora DSQL + IAM connection (TTL cache)
│   │   │   ├── index.ts                  # Database interface
│   │   │   ├── migration.ts              # runMigrations runner
│   │   │   ├── operations/<domain>Operations.ts
│   │   │   └── schema/<table>.ts         # Kysely table interfaces
│   │   └── s3/{fileStorage,index}.ts
│   ├── migration/
│   │   ├── run-migrations.ts             # entry script (pnpm migrate)
│   │   └── sql/V<n>__<name>.sql          # immutable applied migrations
│   └── utils/
└── tsconfig.{json,paths,scripts}.json
```

`tsconfig.paths.json` defines `@contracts/*`, `@functions/*`, `@libs/*`, `@utils/*` aliases. Use them in source files.

`tsconfig.scripts.json` is loosened for `ts-node` so the migration runner can execute. Don't relax production tsconfig for similar reasons.

## Adding a handler

Use `/new-handler <METHOD> <PATH>` or the `lambda-handler-author` subagent. The shape:

1. Add the Zod schema to `src/contracts/<domain>/request.ts`.
2. Add the response type to `src/contracts/<domain>/response.ts`.
3. Write the handler in `src/functions/<domain>/<verb>.ts` using `middyfy` (see `lambda-handler` skill).
4. Wire the route in `bin/functionStack.ts` with `requiresAuth: true` (almost always).
5. If the handler needs a new DB query, add it to `src/libs/db/operations/<domain>Operations.ts` with a typed `(db: Kysely<Database>, ...) => Promise<...>` signature for testability.

## Authorization

Every domain handler MUST scope its queries by `event.requestContext.authUser.userId`. Aurora DSQL has no row-level security automatically — multi-tenant isolation is the application's job. The `security-auditor` subagent checks this on every PR review.

## Adding a migration

Use `/new-migration <description>` or the `migration-writer` subagent. The hard rules (also encoded in `kysely-migration` skill and the pre-tool-use hook):

- New file under `src/migration/sql/V<n+1>__<snake>.sql`. Never edit applied migrations.
- Same commit must update `src/libs/db/schema/<table>.ts` and (for new tables) `src/libs/db/index.ts` `Database` interface.
- Apply locally before push: `ENV=dev pnpm --filter @twy/functions migrate`. CI applies it before `cdk deploy`.

## DB connection pattern

```typescript
import { getDb } from "@libs/db/client";

const db = await getDb();
const user = await db.selectFrom("users").where("id", "=", userId).selectAll().executeTakeFirst();
```

`getDb()` caches the pool for 10 minutes (TTL refresh, since DSQL IAM tokens last 15 min). Don't construct your own `Pool` or your own `Kysely` instance.

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
ENV=dev pnpm --filter @twy/functions migrate    # apply pending V*__*.sql
ENV=dev pnpm --filter @twy/functions synth
ENV=dev pnpm --filter @twy/functions diff
ENV=dev pnpm --filter @twy/functions deploy
```

CI runs `migrate` before `deploy`. Always test locally against dev first if your handler depends on the new schema.
