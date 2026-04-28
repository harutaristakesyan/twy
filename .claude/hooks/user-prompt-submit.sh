#!/usr/bin/env bash
# UserPromptSubmit hook — fires every time the user sends a message.
# Injects lightweight repo context (branch, change summary) so Claude doesn't have to
# burn tool calls on `git status` for every turn. Output goes into Claude's context.
#
# Performance: this runs on EVERY prompt, so keep it under ~150ms and under ~25 lines of output.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT" || exit 0

# Only print if state has actually changed since last prompt — avoid noise.
STATE_FILE=".claude/.cache/last-prompt-state"
mkdir -p "$(dirname "$STATE_FILE")"

BRANCH="$(git branch --show-current 2>/dev/null || echo 'detached')"
DIRTY_COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
HEAD_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'none')"
SIGNATURE="${BRANCH}|${HEAD_SHA}|${DIRTY_COUNT}"

if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null)" = "$SIGNATURE" ]; then
  exit 0
fi
echo "$SIGNATURE" > "$STATE_FILE"

echo "<repo-state>"
echo "branch: $BRANCH @ $HEAD_SHA"
if [ "$DIRTY_COUNT" -gt 0 ]; then
  echo "uncommitted changes ($DIRTY_COUNT files):"
  git status --porcelain 2>/dev/null | head -20 | sed 's/^/  /'
  if [ "$DIRTY_COUNT" -gt 20 ]; then
    echo "  ...and $((DIRTY_COUNT - 20)) more"
  fi
fi

# Which apps are touched? Helps the agent scope test/build commands.
TOUCHED_APPS=$(git status --porcelain 2>/dev/null | awk '{print $NF}' | grep -oE '^(apps/[a-z-]+|packages/[a-z-]+)' | sort -u | tr '\n' ' ')
if [ -n "$TOUCHED_APPS" ]; then
  echo "touched packages: $TOUCHED_APPS"
fi
echo "</repo-state>"
exit 0
