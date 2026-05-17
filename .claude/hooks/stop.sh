#!/usr/bin/env bash
# Stop hook — runs when Claude finishes its turn. Last-chance integrity check before
# the user sees "done". Surfaces:
#   - secret-looking strings staged in the index
#   - biome ci failure on the working tree
#   - tracked .env files (other than the allowed apps/ui ones)
#
# Output to stderr is shown to Claude, NOT to the user. Exit 2 with stderr asks Claude to
# continue — but we deliberately never block Stop here; we only annotate. Forcing the agent
# back into the loop on every turn is more disruptive than helpful.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT" || exit 0

WARNINGS=()

# 1. Secret-looking patterns in the diff (staged + unstaged).
SECRET_HITS=$(git diff HEAD 2>/dev/null \
  | grep -E '^\+' \
  | grep -aEi '(aws_secret_access_key|aws_session_token|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password[[:space:]]*=[[:space:]]*["'"'"'][^"'"'"']{6,}|secret[[:space:]]*=[[:space:]]*["'"'"'][^"'"'"']{6,}|token[[:space:]]*=[[:space:]]*["'"'"'][^"'"'"']{20,})' \
  | head -3)
if [ -n "$SECRET_HITS" ]; then
  WARNINGS+=("Possible secret in diff — review before committing:")
  WARNINGS+=("$SECRET_HITS")
fi

# 2. Tracked .env files that aren't the public Vite ones.
BAD_ENV=$(git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -vE '^apps/dashboard/\.env\.(development|production)$' | head -5)
if [ -n "$BAD_ENV" ]; then
  WARNINGS+=("Tracked .env file(s) detected — only apps/dashboard/.env.{development,production} are allowed:")
  WARNINGS+=("$BAD_ENV")
fi

# 3. Quick biome ci on touched files (don't run full repo — too slow).
CHANGED=$(git diff --name-only HEAD 2>/dev/null \
  | grep -E '\.(ts|tsx|js|jsx|json)$' \
  | grep -vE '(^|/)(dist|out|coverage|node_modules|\.turbo|\.sst)/' \
  | head -50 \
  | tr '\n' ' ')
if [ -n "$CHANGED" ]; then
  BIOME_OUT=$(timeout 12 pnpm exec biome ci --no-errors-on-unmatched $CHANGED 2>&1)
  BIOME_RC=$?
  if [ $BIOME_RC -ne 0 ]; then
    WARNINGS+=("biome ci failed on touched files (CI will reject):")
    WARNINGS+=("$(printf '%s\n' "$BIOME_OUT" | tail -25)")
  fi
fi

# 4. Detect any new migration file — remind to run `pnpm --filter @twy/db migrate`.
NEW_MIG=$(git status --porcelain 2>/dev/null \
  | grep -E '^\?\? packages/db/drizzle/[0-9]+_.*\.sql$' \
  | head -3)
if [ -n "$NEW_MIG" ]; then
  WARNINGS+=("New migration(s) detected — they must be applied to dev before deploy:")
  WARNINGS+=("$NEW_MIG")
  WARNINGS+=("Run: pnpm --filter @twy/db migrate")
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  {
    echo "<stop-hook-warnings>"
    printf '%s\n' "${WARNINGS[@]}"
    echo "</stop-hook-warnings>"
  } >&2
fi

# Always allow Stop; warnings are informational.
exit 0
