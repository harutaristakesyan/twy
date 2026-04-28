---
description: Run the full pre-commit verification gate (biome, build, test), then guide a Conventional Commit and (with confirmation) a push.
allowed-tools: Bash, Read, Edit, Grep, Glob
argument-hint: "[optional: short commit subject]"
---

You are running the SHIP workflow. Goal: take the working tree from "feature done" to "merged-ready commit pushed to a feature branch", with the same gates CI will run.

## Steps (do them in order, abort if any step fails)

1. **Confirm clean intent**. Show `git status --short`. If there are unrelated changes, ask the user whether to include them. Do not silently include unrelated work.

2. **Verify the gate**:
   ```
   pnpm install --frozen-lockfile
   pnpm exec biome ci .
   pnpm turbo run build
   pnpm turbo run test
   ```
   If any step fails, STOP and report the failure. Do not commit.

3. **Run the code-reviewer subagent** with the current diff. Surface its blockers/majors. If it returns blockers, STOP.

4. **Compose the commit message**. Conventional Commits with **scope required** (header ≤150 chars). User-provided subject: `$ARGUMENTS`. If empty, infer from the diff's most-changed package and the dominant change type (`feat`, `fix`, `refactor`, etc.). Example: `feat(functions): add GET /loads/{id} handler`.

5. **Show the proposed commit** to the user and wait for explicit confirmation before running `git commit`.

6. **Push** only if the user explicitly says "push". Use `git push -u origin <current-branch>` (the deny list blocks `--force` variants). Never push to `main`/`master` directly — confirm the branch name.

7. **Report**: branch name, commit SHA, and the GitHub PR URL pattern (`https://github.com/<repo>/pull/new/<branch>`).

## Hard rules

- Never bypass the gate with `--no-verify`.
- Never amend a commit that's already on `main` or already pushed (deny list catches `git push --force` either way).
- If the diff includes a new `V<n>__*.sql` migration, remind the user to run `pnpm --filter @twy/functions migrate` against dev BEFORE the deploy job runs.
