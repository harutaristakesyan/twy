---
description: Reconcile CLAUDE.md, README.md, nested CLAUDE.md, and .claude/README.md with current code state.
allowed-tools: Bash, Read, Edit, Grep, Glob
argument-hint: "[optional: scope, e.g. functions or ui]"
---

You are syncing documentation to code reality. Argument: `$ARGUMENTS` (optional package scope).

Delegate to the **docs-writer** subagent. Pass it:
- The scope (or "all" if `$ARGUMENTS` is empty).
- The output of `git log --oneline -50` so it sees recent change patterns.

After the subagent finishes:
1. Re-grep for stale references it might have missed:
   ```
   rg -i "TODO|TBD|FIXME|XXX" CLAUDE.md README.md apps/*/CLAUDE.md packages/*/CLAUDE.md .claude/
   ```
2. Re-confirm all package versions cited in docs match `package.json` (root + per-package).
3. Suggest commit: `docs(<scope>): sync to <commit-range>`.
