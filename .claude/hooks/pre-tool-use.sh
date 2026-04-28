#!/usr/bin/env bash
# PreToolUse hook — runs before Bash, Edit, Write, MultiEdit.
# Reads JSON from stdin: {"tool_name":"...", "tool_input":{...}, "session_id":"...", ...}
# Exit 0  -> allow.
# Exit 2  -> deny with reason printed to stderr (Claude sees the reason and can adjust).
#
# This is a defense-in-depth layer on top of permissions.deny in settings.json. The
# permissions list catches command shapes; this catches semantic issues (writing into a
# protected dir, executing a destructive shell pattern, modifying an applied migration).

set -uo pipefail

INPUT="$(cat)"
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')

case "$TOOL" in
  Bash)
    CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

    # Block destructive git operations even when invoked through subshells.
    if printf '%s' "$CMD" | grep -qE '(^|[;&|`( ])git[[:space:]]+push[[:space:]].*(--force|-f([[:space:]]|$)|--force-with-lease)'; then
      echo "DENY: git push --force* is forbidden. Open a PR or rebase locally; never rewrite shared history." >&2
      exit 2
    fi
    if printf '%s' "$CMD" | grep -qE '(^|[;&|`( ])git[[:space:]]+reset[[:space:]]+--hard'; then
      echo "DENY: 'git reset --hard' destroys uncommitted work. Use 'git stash' or 'git restore --staged' instead." >&2
      exit 2
    fi
    if printf '%s' "$CMD" | grep -qE 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f?[[:space:]]+(/|~|\.\.|\$HOME|\$\{HOME\})'; then
      echo "DENY: refusing recursive rm against /, ~, .., or \$HOME." >&2
      exit 2
    fi
    if printf '%s' "$CMD" | grep -qE 'rm[[:space:]]+-rf?[[:space:]]+(node_modules|\.turbo|cdk\.out|dist|coverage|\.git)([[:space:]]|/|$)'; then
      # These are recoverable, but do them via pnpm/turbo cleanup commands so the user is asked.
      echo "DENY: don't rm -rf build/cache dirs directly. Use 'pnpm turbo run build --force' or 'pnpm install' to rebuild." >&2
      exit 2
    fi

    # Mutating an already-applied migration is the #1 way to break the cluster.
    if printf '%s' "$CMD" | grep -qE 'apps/functions/src/migration/sql/V[0-9]+__.*\.sql' \
       && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])(sed|>|>>|tee|truncate|rm)[[:space:]]'; then
      echo "DENY: migration files under apps/functions/src/migration/sql/ are immutable once committed. Add a new V(n+1)__ migration instead." >&2
      exit 2
    fi

    # Bash that prints credentials.
    if printf '%s' "$CMD" | grep -qE '(cat|less|head|tail|grep)[[:space:]]+[^|]*\.(env|env\.local|pem|key)([[:space:]]|$)'; then
      echo "DENY: refusing to read .env/.pem/.key files. Use 'aws ssm get-parameter' for secrets, or ask the user to confirm the value." >&2
      exit 2
    fi

    exit 0
    ;;

  Edit|Write|MultiEdit)
    FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
    [ -z "$FILE" ] && exit 0

    # Protect applied migrations.
    if printf '%s' "$FILE" | grep -qE 'apps/functions/src/migration/sql/V[0-9]+__.*\.sql$'; then
      # Allow if the file does not yet exist — that's a brand new migration.
      if [ -f "$FILE" ]; then
        echo "DENY: $FILE has been applied to at least one cluster. Add a new V(n+1)__ migration instead of editing this one." >&2
        exit 2
      fi
    fi

    # Block edits to lockfile.
    if printf '%s' "$FILE" | grep -qE '(^|/)pnpm-lock\.yaml$'; then
      echo "DENY: pnpm-lock.yaml is owned by 'pnpm install'. Update package.json and re-run install instead." >&2
      exit 2
    fi

    # Block secret files.
    if printf '%s' "$FILE" | grep -qE '\.(env|env\.local|pem|key)$' \
       && ! printf '%s' "$FILE" | grep -qE 'apps/ui/\.env\.(development|production)$'; then
      echo "DENY: refusing to write secret/.env file at $FILE. Public Vite envs at apps/ui/.env.{development,production} are the only exception." >&2
      exit 2
    fi

    # Block edits inside dist/ and cdk.out/.
    if printf '%s' "$FILE" | grep -qE '(^|/)(dist|cdk\.out|out|coverage|node_modules|\.turbo)/'; then
      echo "DENY: $FILE is a build artifact directory — edit the source instead." >&2
      exit 2
    fi

    exit 0
    ;;

  *)
    exit 0
    ;;
esac
