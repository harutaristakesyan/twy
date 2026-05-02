---
description: Edit a Drizzle pgTable schema, then run `drizzle-kit generate` to add a new migration under packages/db/drizzle/. Never edits an already-generated migration.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
argument-hint: "<short_snake_case_description>  e.g. add_loads_priority_column"
---

You are creating a new database migration. Argument: `$ARGUMENTS`.

Delegate to the **migration-writer** subagent. Pass it:
- The description from `$ARGUMENTS` (used as the human label for the schema change).
- A short prose description of the schema change (ask the user if not implied by the description).

After the subagent finishes:
1. Confirm a new file appeared under `packages/db/drizzle/<n>_<auto>.sql` and that `packages/db/drizzle/meta/_journal.json` and `meta/<n>_snapshot.json` were updated.
2. Confirm the schema TS in `packages/db/src/schema/` was updated, and `schema/index.ts` re-exports any new table.
3. **Do NOT run the migration**. Print the exact command for the user to run manually (against dev first):
   ```
   pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
   ```
4. Suggest the commit message: `feat(functions): $ARGUMENTS`.

## Hard rule

The pre-tool-use hook will refuse to overwrite any existing `packages/db/drizzle/<n>_*.sql`. Do not attempt — make the schema change and re-run `pnpm --filter @twy/db db:generate` so a new numbered migration is added.
