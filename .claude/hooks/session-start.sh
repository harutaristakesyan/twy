#!/usr/bin/env bash
# SessionStart hook — prints a project status briefing into Claude's context on startup/resume/clear.
# Output to stdout becomes additional context for Claude. Keep it small and signal-dense; Claude pays for
# every token. Hard cap: ~40 lines.
#
# Wired into .claude/settings.json -> hooks.SessionStart with matcher "startup|resume|clear".

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

echo "=== twy session briefing ==="
echo "branch:  $(git branch --show-current 2>/dev/null || echo '(detached)')"
echo "head:    $(git log -1 --format='%h %s' 2>/dev/null | head -c 120)"
echo "status:  $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') uncommitted files"

# Pending migrations — count [0-9]*_*.sql files vs the latest one mentioned in recent migration_log work.
MIG_DIR="packages/db/drizzle"
if [ -d "$MIG_DIR" ]; then
  MIG_COUNT=$(find "$MIG_DIR" -name '[0-9]*_*.sql' 2>/dev/null | wc -l | tr -d ' ')
  LATEST_MIG=$(find "$MIG_DIR" -name '[0-9]*_*.sql' 2>/dev/null | sort | tail -1 | xargs -I{} basename {})
  echo "migrations: $MIG_COUNT files, latest=$LATEST_MIG"
fi

# Quick env sanity
echo "node:    $(node --version 2>/dev/null || echo 'missing')"
echo "pnpm:    $(pnpm --version 2>/dev/null || echo 'missing')"
echo "ENV:     ${ENV:-dev} (override in .claude/settings.local.json)"

# Are deps installed?
if [ ! -d "node_modules" ]; then
  echo "WARN: node_modules missing — run 'pnpm install' before building."
fi

# Untracked files in protected migration dir = something half-written
if git ls-files --others --exclude-standard "$MIG_DIR" 2>/dev/null | grep -q .; then
  echo "WARN: untracked SQL files in $MIG_DIR — review before any migrate/deploy."
fi

# Last 3 commits for context
echo ""
echo "recent commits:"
git log --oneline -3 2>/dev/null | sed 's/^/  /'

echo ""
echo "tip: /verify runs lint+build+test. /ship guides a clean commit. See .claude/README.md for the full agent/command index."
echo "=== end briefing ==="
exit 0
