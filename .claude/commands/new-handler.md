---
description: Scaffold a new HTTP handler (auth or functions app) with contract, route wiring, and optional Drizzle operation.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
argument-hint: "<METHOD> <PATH>  e.g. GET /loads/{id}  or  POST /auth/login"
---

You are scaffolding a new HTTP endpoint. Argument: `$ARGUMENTS`.

Delegate to the **lambda-handler-author** subagent. Pass it:
- The METHOD and PATH from `$ARGUMENTS`.
- Whether the route requires auth (default YES; only login/signup/forgot-password style routes are public).
- The domain it belongs to (parsed from the path, e.g. `/loads/...` → `load` under `apps/functions`).

After the subagent finishes:
1. Read the generated handler and confirm it follows the `middyfy` + Zod + `mode: "parse"` pattern.
2. Run `pnpm --filter @twy/<package> build` to verify the package compiles.
3. Optionally invoke the **test-writer** subagent to add a Vitest for the new handler.
4. Suggest the commit message: `feat(<package>): add <METHOD> <PATH> handler`.

Do NOT deploy — that's a separate manual step gated on user confirmation.
