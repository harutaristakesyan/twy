---
name: drizzle-migration
description: Use when adding or altering a database table/column. Covers the schema-first workflow with Drizzle pgTable + drizzle-kit generate, the immutable packages/db/drizzle/<n>_*.sql files, the snake_case ↔ camelCase mapping, and the safe additive-migration pattern for Aurora Serverless v2 (Postgres) over the RDS Data API.
---

# Drizzle / Aurora Serverless v2 migration recipe

## When this skill applies

- Adding a new table.
- Adding/altering/dropping a column on an existing table.
- Adding indexes or unique constraints.
- Diagnosing migration runner failures.

## Hard rules

1. **Edit the schema, not the SQL.** All schema changes happen in TypeScript under `packages/db/src/schema/<table>.ts`. `drizzle-kit generate` diffs the schema against `packages/db/drizzle/meta/` and produces a new numbered migration.
2. **Never edit a previously generated `packages/db/drizzle/<n>_*.sql`** once it has been applied to any cluster. Drizzle's migrator records every applied filename in the `__drizzle_migrations` table — mutating an applied file silently diverges dev, prod, and any new dev clusters. Add a new migration via another schema edit + `db:generate`. The pre-tool-use hook enforces this.
3. **Commit the whole `packages/db/drizzle/` folder** — including `meta/_journal.json` and `meta/<n>_snapshot.json`. The snapshots are the source of truth `drizzle-kit` diffs against; if they drift, future generates will produce nonsense.
4. **Snake_case in DB, camelCase in TS.** The Drizzle client and the kit are both configured with `casing: 'snake_case'`, so a TS field named `customerRate` becomes column `customer_rate` automatically. Don't pass an explicit column name unless the auto-derivation is wrong.

## Workflow

```bash
# 1. Edit a pgTable under packages/db/src/schema/<table>.ts
#    (or add a new file and re-export it from schema/index.ts)

# 2. Diff schema → new migration SQL + updated meta snapshot
pnpm --filter @twy/db db:generate

# 3. Inspect the generated SQL — drizzle-kit is good but not infallible.
#    Particularly review: column type changes, NOT NULL additions on existing tables,
#    DROP COLUMN.

# 4. Apply against a stage
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate

# 5. Smoke-test handlers against the new schema, then commit.
```

## Schema TS template

```typescript
// packages/db/src/schema/<table>.ts
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const <table> = pgTable("<table_snake>", {
  id: uuid().primaryKey().defaultRandom(),
  // camelCase TS keys map to snake_case columns automatically
  someField: text().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type <Table>Row = typeof <table>.$inferSelect;
export type New<Table> = typeof <table>.$inferInsert;
```

Then re-export from `packages/db/src/schema/index.ts`:

```typescript
export * from "./<table>";
```

## Aurora Serverless v2 (Postgres) notes

This is a real Postgres engine — no DSQL caveats. Triggers, foreign keys, materialized views, GIN indexes, etc. all work. The only meaningful constraint is that we run queries through the **RDS Data API** (HTTPS, JSON-encoded) instead of a TCP socket:

- No `LISTEN/NOTIFY`, no cursors, no transactions that span requests.
- A Data API call has a hard 30s timeout; long migrations need to be chunked.
- For long-running schema changes, prefer additive migrations: add nullable column → backfill via a separate migration → set NOT NULL in a third.

## Apply

```bash
# Locally
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate

# CI does the same after `sst deploy` succeeds — see .github/workflows/ci-cd.yml.
```

## Common failures

- **`AccessDenied: rds-data:ExecuteStatement`** → the IAM role running `sst shell` (or the deploy role in CI) lacks `rds-data:*` on the cluster ARN. With `link[]` it's auto-granted; check `infra/api.ts` includes `cluster` in `linkRegistry` and the migration runner is launched via `sst shell`.
- **`SecretsManager: GetSecretValue denied`** → same fix path; `link[]` grants both Data API and Secrets Manager perms.
- **`drizzle-kit generate` produced nothing** → schema is in sync with `meta/` snapshot. If you expected a diff, check that you exported the new pgTable from `schema/index.ts`.
- **`drizzle-kit generate` produced too much** → `meta/` snapshots got out of sync (someone hand-edited a SQL file or dropped the meta folder). Don't accept the diff — restore from git, then re-run.
