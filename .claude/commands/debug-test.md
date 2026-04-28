---
description: Root-cause a failing test or build. Delegates to the debugger subagent with the failure context.
allowed-tools: Bash, Read, Grep, Glob
argument-hint: "[optional: test name, file path, or error snippet]"
---

You are debugging a failure. Argument: `$ARGUMENTS`.

## Steps

1. **Reproduce the failure**:
   - If `$ARGUMENTS` is a test name or file → `pnpm --filter @twy/<pkg> exec vitest run <path>`.
   - If `$ARGUMENTS` is empty → run `pnpm test` to surface what's failing.
   - If `$ARGUMENTS` is a build error → run `pnpm turbo run build` and capture the failure.
2. **Capture the failure output** in full (stack trace, line numbers).
3. **Delegate to the debugger subagent** with: the exact failing command, the captured output, and the file(s) referenced in the trace.
4. The debugger returns a Repro / Root Cause / Fix / Verify block.
5. **Apply the fix** ONLY if the user confirms the root cause is correct. Otherwise, report and stop.
6. **Re-run** the failing test/build to confirm green.
7. Suggest a commit message: `fix(<scope>): <root-cause summary>`.

## Hard rules

- Don't paper over with `it.skip` or `try/catch swallow`. Fix the cause or report it as unresolved.
- If the fix changes behavior of unrelated code, STOP and split the change.
