#!/usr/bin/env bash
# PostToolUse hook — runs after Edit/Write/MultiEdit successfully complete.
# Auto-formats and lints the just-touched file with Biome (the project's single source of truth
# per CLAUDE.md). Stays out of the way: timeouts at 8s, errors are non-fatal, no output unless
# Biome flagged something.
#
# We deliberately do NOT trigger a full `pnpm test` or `pnpm build` here — that's expensive and
# scope-shifts the agent's attention. Use /verify or the `Stop` hook for end-of-turn checks.

set -uo pipefail

INPUT="$(cat)"
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Only run Biome on files Biome handles.
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.json|*.jsonc) ;;
  *) exit 0 ;;
esac

# Skip lockfiles, dist, cdk.out, node_modules.
case "$FILE" in
  */pnpm-lock.yaml|*/node_modules/*|*/dist/*|*/cdk.out/*|*/coverage/*|*/.turbo/*) exit 0 ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

# Run Biome check + write (autofix safe rules, format).
# Output captured; only surface to Claude if there's a non-trivial diagnostic left.
OUTPUT=$(timeout 8 pnpm exec biome check --write --no-errors-on-unmatched "$FILE" 2>&1)
RC=$?

if [ $RC -ne 0 ]; then
  # Biome left lint errors that autofix couldn't resolve. Report to Claude so it can fix them.
  echo "<biome-post-edit file=\"$FILE\" exit=\"$RC\">"
  printf '%s\n' "$OUTPUT" | tail -40
  echo "</biome-post-edit>"
fi

exit 0
