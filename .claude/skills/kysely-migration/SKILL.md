---
name: kysely-migration
description: Use when adding or altering a database table/column. Covers the V<n+1>__ filename convention, the Aurora DSQL dialect quirks, the schema TS update that must accompany every SQL migration, and the safe additive migration pattern.
---

# Kysely / Aurora DSQL migration recipe

## When this skill applies

- Adding a new table.
- Adding/altering/dropping a column on an existing table.
- Adding indexes or unique constraints.
- Diagnosing migration runner failures.

## Hard rules

1. **Never edit an existing `V<n>__*.sql`** — the runner records applied filenames in `_migration_log`. Mutating an applied file silently diverges dev from prod from any new dev clusters. Add `V<n+1>__*.sql` instead. The pre-tool-use hook enforces this.
2. **Filename**: `V<n>__<snake_case_description>.sql` where `<n>` is exactly one greater than the current max in `apps/functions/src/migration/sql/`.
3. **Update the schema TS** in `apps/functions/src/libs/db/schema/<table>.ts` AND the `Database` interface in `apps/functions/src/libs/db/index.ts` in the same commit.

## Aurora DSQL dialect notes

DSQL is PostgreSQL-compatible but with restrictions. Verify against `https://docs.aws.amazon.com/aurora-dsql/` before relying on advanced features:

- Use `gen_random_uuid()` for UUID defaults — matches existing tables.
- DSQL **does not support** triggers, stored procedures, materialized views, or foreign key enforcement (as of 2026 — recheck if uncertain).
- Strongly-consistent reads on the primary key. Indexes for other access patterns must be explicit.
- Long-running schema changes should be additive: add nullable column → backfill → set NOT NULL in a later migration.

## Migration template

```sql
-- V<n>__<description>.sql
-- Purpose: <one sentence>
-- Safety: additive | destructive | renames
-- Backout: <inverse migration if destructive>

CREATE TABLE IF NOT EXISTS <table> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS <table>_<col>_idx ON <table> (<col>);
```

## Schema TS template

```typescript
// apps/functions/src/libs/db/schema/<table>.ts
import type { ColumnType, Generated } from "kysely";

export interface <Table>Table {
  id: Generated<string>;
  // camelCase property names ↔ snake_case columns (CamelCasePlugin)
  createdAt: ColumnType<Date, string | undefined, never>;
  updatedAt: ColumnType<Date, string | undefined, string>;
}
```

```typescript
// apps/functions/src/libs/db/index.ts — add to Database interface
import type { <Table>Table } from "./schema/<table>.js";

export interface Database {
  // ...existing
  <table_snake>: <Table>Table;
}
```

## Apply

The runner is at `apps/functions/src/migration/run-migrations.ts`. Run via:

```bash
ENV=dev pnpm --filter @twy/functions migrate
```

CI runs it automatically before `cdk deploy` for the `@twy/functions` stack. Locally, you must run it yourself when testing handlers that need new schema.

## Common failures

- **`role missing dsql:DbConnectAdmin`** → the deploying IAM role lacks the permission. Check `apps/infra/bin/stacks/db-stack.ts` IAM grants.
- **`token expired`** → DSQL IAM tokens last 15 min. Re-export `POSTGRES_DEV_URL` if you're connecting outside the runner.
- **`relation already exists`** → you used `CREATE TABLE` instead of `CREATE TABLE IF NOT EXISTS`. Be defensive: the runner is supposed to skip applied migrations, but `IF NOT EXISTS` makes the SQL safe even if state diverges.
