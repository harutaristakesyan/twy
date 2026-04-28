---
description: Author a new Kysely SQL migration (V<n+1>__name.sql) plus the schema TS update. Never edits applied migrations.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
argument-hint: "<short_snake_case_description>  e.g. add_loads_priority_column"
---

You are creating a new database migration. Argument: `$ARGUMENTS`.

Delegate to the **migration-writer** subagent. Pass it:
- The description from `$ARGUMENTS` (used in filename).
- A short prose description of the schema change (ask the user if not implied by the description).

After the subagent finishes:
1. Confirm the new file follows the V<n+1>__ convention by listing `apps/functions/src/migration/sql/`.
2. Confirm the schema TS in `apps/functions/src/libs/db/schema/` was updated.
3. Confirm the `Database` interface in `apps/functions/src/libs/db/index.ts` was updated if a new table was added.
4. **Do NOT run the migration**. Print the exact command for the user to run manually (against dev first):
   ```
   ENV=dev pnpm --filter @twy/functions migrate
   ```
5. Suggest the commit message: `feat(functions): add migration V<n>__$ARGUMENTS`.

## Hard rule

The pre-tool-use hook will refuse to overwrite any existing `V*__*.sql`. Do not attempt — write a new V<n+1>__ instead.
