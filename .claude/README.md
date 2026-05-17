# Claude Code environment for the twy monorepo

This directory turns a fresh clone into a working Claude Code agent environment. After `pnpm install`, opening `claude` in the repo root activates everything described below — no per-machine setup beyond AWS credentials and (optionally) a GitHub PAT.

## What's here

```
.claude/
├── README.md                         # this file
├── settings.json                     # project-shared config (committed)
├── settings.local.example.json       # template for personal overrides
├── agents/                           # specialized subagents (Task tool)
│   ├── code-reviewer.md
│   ├── test-writer.md
│   ├── debugger.md
│   ├── refactoring-specialist.md
│   ├── docs-writer.md
│   ├── migration-writer.md
│   ├── lambda-handler-author.md
│   ├── cdk-stack-reviewer.md
│   └── security-auditor.md
├── commands/                         # slash commands (typed at the prompt)
│   ├── ship.md
│   ├── verify.md
│   ├── review-pr.md
│   ├── new-handler.md
│   ├── new-migration.md
│   ├── debug-test.md
│   └── sync-docs.md
├── hooks/                            # bash scripts wired into Claude lifecycle
│   ├── session-start.sh              # SessionStart: status briefing
│   ├── user-prompt-submit.sh         # UserPromptSubmit: inject branch + diff state
│   ├── pre-tool-use.sh               # PreToolUse: protect migrations, secrets, destructive shell
│   ├── post-tool-use.sh              # PostToolUse: auto-format edited files with biome
│   └── stop.sh                       # Stop: secret scan + biome ci on touched files
└── skills/                           # callable skills with detailed procedures
    ├── lambda-handler/SKILL.md
    ├── drizzle-migration/SKILL.md
    ├── ui-page-scaffold/SKILL.md
    └── cdk-stack/SKILL.md
```

Plus, at the repo root:
- `.mcp.json` — project-scoped MCP servers (heroui-react, filesystem, git, github, postgres-dev).
- `CLAUDE.md` — root project doc; nested `apps/*/CLAUDE.md` and `packages/*/CLAUDE.md` for module-specific context.

## Subagents — what each one does

Subagents are invoked via the `Task` tool (`"subagent_type": "<name>"`). They run in their own context window, then return a summary. Use them for focused, bounded tasks.

| Agent | When to use | Model |
|---|---|---|
| `code-reviewer` | Before `/ship`, after a logical chunk lands. Reviews diff against twy conventions. | opus |
| `test-writer` | After writing new code. Generates Vitest tests matching project style. | sonnet |
| `debugger` | When a test/build/runtime fails. Returns repro + root cause + minimal fix. | opus |
| `refactoring-specialist` | For ≥2-file refactors or public-API changes. Tidy First / Mikado method. | sonnet |
| `docs-writer` | When CLAUDE.md/README.md drifts from code. After a feature merges. | sonnet |
| `migration-writer` | When adding/altering a DB table or column. Edits the Drizzle schema, then `drizzle-kit generate`s the new migration. | sonnet |
| `lambda-handler-author` | When adding a new HTTP endpoint. Codifies middyfy + Zod + route wiring. | sonnet |
| `cdk-stack-reviewer` | After any edit to `sst.config.ts` or `infra/`. Catches SST/Pulumi/AWS deploy-time pitfalls. | opus |
| `security-auditor` | Before merging any change to auth, IAM, env vars, SQL, or Lambda permissions. | opus |

## Slash commands

Type these at the prompt:

| Command | What it does |
|---|---|
| `/verify` | Runs the full local gate (biome ci, turbo build/test/check). Matches CI exactly. |
| `/ship [subject]` | Verify gate + code-reviewer + Conventional Commit + (with confirmation) push. |
| `/review-pr [N or branch]` | Runs code-reviewer + (conditionally) security-auditor + cdk-stack-reviewer on a diff. |
| `/new-handler <METHOD> <PATH>` | Delegates to lambda-handler-author. |
| `/new-migration <description>` | Delegates to migration-writer. |
| `/debug-test [name or path]` | Delegates to debugger. |
| `/sync-docs [scope]` | Delegates to docs-writer. |

## Hooks lifecycle

| Hook | When | What it does |
|---|---|---|
| `SessionStart` | `claude` starts, resumes, or `/clear` | Prints branch, head, dirty count, latest migration, recent commits into Claude's context. |
| `UserPromptSubmit` | Every user message | Injects fresh `<repo-state>` block (branch, dirty files, touched packages) — only if state changed since last prompt. |
| `PreToolUse` | Before Bash/Edit/Write/MultiEdit | Blocks destructive shell, edits to applied migrations or `.env` files, edits to build artifacts. |
| `PostToolUse` | After Edit/Write/MultiEdit | Runs `biome check --write` on the touched file. Surfaces remaining lint errors back into context. |
| `Stop` | When Claude finishes a turn | Scans for secrets in the diff, checks tracked `.env` files, runs biome ci on touched files, reminds about pending migrations. |

Hooks fail-soft: a broken hook never blocks Claude unless it intentionally exits 2. Logs go to stderr (Claude sees them).

## Permissions model

`.claude/settings.json` declares three lists:

- **`allow`**: Read/Edit/Write/Glob/Grep/MultiEdit on the workspace; common pnpm/turbo/biome/git read commands; vetted documentation domains for WebFetch.
- **`ask`**: Anything that mutates remote state (`git push`, `cdk deploy`, `aws *`, `pnpm publish`, `rm`, `chmod`).
- **`deny`**: Reading `.env`/`.pem`/`.key`/`~/.ssh/`; editing `pnpm-lock.yaml` or applied migrations; force pushes; `git reset --hard`; `rm -rf` against root/home; `curl`/`wget`/`ssh`/`sudo`; destructive AWS calls; `npm install -g`.

`defaultMode: "acceptEdits"` lets Claude edit files without per-edit confirmation, but the `ask` list still gates remote-mutating actions.

## MCP servers (`.mcp.json`)

| Server | Purpose | Required env |
|---|---|---|
| `heroui-react` | HeroUI v3 component docs / API lookups | none |
| `filesystem` | Workspace-scoped file walks | none |
| `git` | Read-only git inspection | none |
| `github` | PR/issue ops, /review-pr backing | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `postgres-dev` | Schema introspection vs dev Aurora Serverless v2 cluster | `POSTGRES_DEV_URL` |

A missing optional env var causes the corresponding server to fail fast on first call; Claude falls back to file-based inspection (e.g. reading `packages/db/src/schema/*.ts` instead of querying).

## Personal overrides

Copy `settings.local.example.json` → `settings.local.json` (gitignored). Use it for:
- A different default model on your machine.
- A different `ENV` (e.g. `prod` for a read-only audit session).
- Personal `allow`/`deny` additions.

`settings.local.json` wins over `settings.json` for any conflicting key.

## Extending the environment

### Add a subagent
1. Create `.claude/agents/<name>.md` with YAML frontmatter:
   ```
   ---
   name: <name>
   description: <when to use — be specific, this is what triggers Claude to delegate>
   tools: Read, Grep, Glob, Bash, Edit
   model: sonnet | opus | haiku
   ---
   ```
2. Body is the agent's system prompt. Be concrete about inputs, process, and output format.
3. Reference it from a slash command if it's a common workflow.

### Add a slash command
1. Create `.claude/commands/<name>.md` with frontmatter:
   ```
   ---
   description: <one line>
   allowed-tools: Bash, Read, Edit
   argument-hint: "<format>"
   ---
   ```
2. Body uses `$ARGUMENTS` for substituted args, `!command` to run shell, `@path` to inject file contents.

### Add a skill
1. Create `.claude/skills/<name>/SKILL.md` with frontmatter `name` + `description` (the trigger).
2. Body is a markdown procedure. Skills are auto-discovered by description matching.

### Add a hook
1. Write the script under `.claude/hooks/`. Make it executable (`chmod +x`).
2. Wire it in `.claude/settings.json` under the `hooks` block with the right matcher (`Bash`, `Edit|Write|MultiEdit`, etc.).
3. Hooks read JSON from stdin (`tool_name`, `tool_input`, `session_id`, ...). Exit 0 to allow, exit 2 with stderr to deny.

## Forbidden actions (encoded in deny list, hooks, and agent prompts)

- `git push --force` / `--force-with-lease` to any branch.
- Editing an existing `packages/db/drizzle/<n>_<auto>.sql` file.
- Editing `pnpm-lock.yaml` directly (use `pnpm install`).
- Reading `.env` / `.pem` / `.key` / SSH keys.
- `rm -rf` against `/`, `~`, `..`, or build/cache directories (`node_modules`, `.turbo`).
- `aws iam:*`, `aws sts assume-role`, `aws s3 rb`, `aws cloudformation delete-stack`.
- Bypassing `biome ci` with `--no-verify`.
- Renaming `primaryDomain` in `infra/domain.ts` (forces CloudFront/cert/Route53 replacement).

## Escalation rules

Claude **must ask** before:
- Pushing to any branch.
- Running any `sst deploy` or `pnpm --filter @twy/db migrate`.
- Running any `aws` CLI command other than read-only `list`/`describe`/`get` with a specific resource.
- Adding a new dependency (the lockfile is on the deny list).
- Removing or renaming a file outside the current task scope.

Claude **may proceed** without asking when:
- Reading or editing files in the workspace.
- Running pnpm/biome/turbo/vitest/tsc commands listed in the allow list.
- Running git read commands (`status`, `diff`, `log`, `show`, `branch`, `fetch`).
- Spawning subagents (Task tool).

## Verification loop

The convention is `write → biome → typecheck → test → /ship`:

1. Make code changes (PostToolUse hook auto-formats each edit).
2. `/verify` — runs biome ci, turbo build, turbo test, turbo check.
3. Spawn `code-reviewer` on the diff. Address blockers/majors.
4. (If touching auth/IAM/SQL) Spawn `security-auditor`.
5. (If touching CDK) Spawn `cdk-stack-reviewer`.
6. `/ship [subject]` — guided commit + push.

## First-session walkthrough

Try this in a fresh clone after `pnpm install`:

1. `claude` — opens Claude Code with this environment loaded.
2. The SessionStart hook prints a 10-line briefing (branch, head, latest migration, etc.).
3. Type `/verify` — runs the full gate. Confirms the environment works.
4. Type `Add a GET /loads/{id}/files endpoint that returns the file metadata` — Claude should invoke `lambda-handler-author` via the contract pattern.
5. After the handler is generated, `code-reviewer` runs and flags any issues.
6. Type `/ship` — verify + commit + (with confirmation) push.
