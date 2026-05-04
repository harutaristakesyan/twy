# packages/db — `@twy/db`

ESM-only package providing the Drizzle ORM client, schema, query operations, and migration runner for the project's **Aurora Serverless v2 (Postgres)** cluster, accessed over the **RDS Data API**.

> This package is at the bottom of the dependency graph. It must be built before any consumer can be bundled. Turbo's `dependsOn: ["^build"]` handles this automatically.

## Public surface (from `src/index.ts`)

```typescript
export { db, type DB } from "./client.js";
export { runMigrations } from "./migration.js";
export * from "./schema/index.js";
export * from "./operations/userOperations.js";
export * from "./operations/branchOperations.js";
export * from "./operations/loadOperations.js";
```

Single entrypoint — consumers import everything from `"@twy/db"`:

```typescript
import { db, users, listLoads, Roles, type LoadStatus } from "@twy/db";
```

## Layout

```
packages/db/
├── drizzle.config.ts          # drizzle-kit input — schema location + Data API creds
├── drizzle/                   # generated migration SQL + meta/ snapshots (committed)
└── src/
    ├── client.ts              # `db` Drizzle instance bound to Resource.Cluster
    ├── migration.ts           # `runMigrations(db, folder)` wrapper
    ├── index.ts               # public re-exports
    ├── schema/
    │   ├── users.ts           # one pgTable per file
    │   ├── branch.ts
    │   ├── file.ts
    │   ├── load.ts
    │   └── index.ts           # barrel + `Roles` enum + `OrderDirection`
    ├── operations/
    │   ├── userOperations.ts  # createUser, listUsers, getFullUserInfoById, …
    │   ├── branchOperations.ts
    │   └── loadOperations.ts
    └── migration/
        └── run-migrations.ts  # tsx-launched runner; uses Resource.Cluster.*
```

## Schema → migration workflow

```bash
# 1. Edit a pgTable under packages/db/src/schema/
# 2. Diff schema → new migration SQL under packages/db/drizzle/
pnpm --filter @twy/db db:generate

# 3. Apply pending migrations against the cluster bound to a stage
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
```

Both commands need `Resource.Cluster.*` resolved. `db:generate` doesn't strictly require a live connection (schema-only diff), but `drizzle.config.ts` reads from `Resource` so it has to run inside `sst shell`. Apply step does need the connection.

## Conventions

- This package is `"type": "module"`. Internal imports use the `.js` extension (NodeNext ESM convention).
- Use `Resource.Cluster.{clusterArn,secretArn,database}` — never `process.env.X`. Resource bindings come from `link: [db.cluster]` declared in `infra/api.ts` / `infra/auth.ts`.
- Column names are snake_case in Postgres; TS keys are camelCase. Drizzle's `casing: "snake_case"` does the mapping — don't add `name:` overrides per column.
- Operation functions own SQL composition; handlers should not import `drizzle-orm` operators. If a handler reaches for `eq`, factor the query into an operation here.
- Migrations are immutable. Never edit a generated SQL file under `drizzle/` after it's been applied to any environment.

## Pitfalls

- **Never `Promise.all([tx.X, tx.Y, ...])` inside `db.transaction(...)`** — Aurora Serverless v2's RDS Data API serialises `ExecuteStatement` calls per `transactionId`. Only one statement may be in flight per transaction at a time. Sending two in parallel causes a race: the second call is rejected with `BadRequestException: Transaction <id> is not in a state...`, which Drizzle re-throws as a generic `Failed query: …`. Use sequential `await`s on `tx.*`, or fan out on `db.*` outside the transaction when the calls aren't part of the atomic boundary.
- **`Resource.Cluster is not defined`** — types come from the auto-generated `sst-env.d.ts` at the repo root (gitignored). Run `pnpm sst dev --stage <yourname>` once to materialize them.
- **Migration runner can't find the folder** — the runner resolves `drizzle/` via `import.meta.url`. If launched from outside the package directory, the relative path still resolves correctly because it's anchored to the source file location, not `process.cwd()`.
- **Lockfile shows two `drizzle-orm` versions** — only this package should depend on `drizzle-orm`. If a consumer adds it to their own `package.json`, remove it; rely on transitive resolution through `@twy/db`.
