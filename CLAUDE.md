# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`README.md` is the canonical reference for layout, scripts, and CI/CD. This file captures the constraints and conventions that aren't obvious from a single-file read.

## Where to look first

| Need | File |
|---|---|
| Per-package conventions (UI, auth, functions, db, lambda-shared) | `apps/<name>/CLAUDE.md`, `packages/<name>/CLAUDE.md` |
| Infrastructure modules (SST components — DB, auth, API, web, storage, email, routes) | `sst.config.ts` + `infra/` |
| Slash commands (`/ship`, `/verify`, `/new-handler`, `/new-migration`, `/debug-test`, `/review-pr`, `/sync-docs`) | `.claude/commands/` |
| Specialized subagents (code-reviewer, debugger, security-auditor, migration-writer, lambda-handler-author, refactoring-specialist, test-writer, docs-writer) | `.claude/agents/` |
| Authoring procedures (Lambda handler, Drizzle migration, UI page, SST component) | `.claude/skills/` |
| Permissions, hooks, model selection | `.claude/settings.json` |
| Onboarding for the agent infra itself | `.claude/README.md` |
| Project-scoped MCP servers (filesystem, git, github, postgres-dev) | `.mcp.json` |

## Verification loop

Always end a working session by running, in order:
1. `/verify` — runs `biome ci`, `turbo build`, `turbo test` (matches CI exactly).
2. `code-reviewer` subagent on the diff. Address blockers/majors.
3. `/ship` — guided commit + push (Conventional Commits with required scope, header ≤150).

Never bypass the gate with `--no-verify`. Never `git push --force*` (the deny list catches it).

## Common commands

```bash
pnpm install                              # one hoisted lockfile at the root
pnpm build                                # turbo run build (respects ^build)
pnpm check                                # biome check --write . (lint + format + import sort)
pnpm check:ci                             # biome ci .  (zero-exit gate; matches CI)
pnpm test                                 # turbo run test
pnpm run:dashboard                        # alias for pnpm --filter @twy/dashboard dev

# SST (infra is now defined in sst.config.ts + infra/)
pnpm sst dev --stage <username>           # personal live-Lambda dev loop
pnpm sst deploy --stage dev               # deploy everything to dev
pnpm sst deploy --stage prod              # deploy everything to prod
pnpm sst remove --stage <stage>           # tear down a stage
pnpm sst shell --stage dev                # open a shell with Resource.* env vars

# Apply pending DB migrations against the cluster bound to a stage
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate

# Scope to one package
pnpm --filter @twy/<name> <script>
pnpm turbo run build --filter @twy/dashboard...    # `...` includes deps
```

Run a single Vitest file: `pnpm --filter @twy/dashboard exec vitest run path/to/file.test.ts`.

## Architecture

A pnpm + Turborepo workspace deployed by a single SST app at the repo root:

```
sst.config.ts                # SST entrypoint — see app() and run()
infra/                       # SST components, one module per concern
  domain.ts, database.ts, storage.ts, email.ts,
  auth.ts, api.ts, web.ts, routes.ts
apps/dashboard       @twy/dashboard   React 19 + Vite SPA, deployed via sst.aws.StaticSite + sst.aws.Router
packages/functions   @twy/functions   All Lambda handlers (HTTP + Cognito) + Middy middleware (src/{api,events,shared,contracts,libs,utils})
packages/db          @twy/db          Drizzle schema, query operations, migration runner (Aurora Data API)
```

Cross-package deps are `workspace:*`. `db` builds first (Turbo `^build`); SST handles bundling each handler with esbuild on `sst deploy`.

### Stages

Two stages are configured: `dev` (DEV_ACCOUNT_ID, dev.twy.am + dev.twy.be) and `prod` (PROD_ACCOUNT_ID, twy.am + twy.be + www variants). Both pinned to `us-east-1` (CloudFront cert requirement). The `app()` block in `sst.config.ts` rejects unknown stages.

### Linking and the Resource SDK

Cross-component values flow through SST's `link[]` — there are no SSM parameters, no env vars, no IAM helpers in handler code. Producer side, in `infra/api.ts`:

```ts
api.route("GET /api/user", "packages/functions/src/api/user/get.handler", {
  auth: { jwt: { authorizer: jwt.id } },
  transform: { function: { link: [db.cluster] } },
});
```

Consumer side, in the handler — never construct a DB client; import the shared one from `@twy/db`:

```ts
import { db, users, eq } from "@twy/db";
const [user] = await db.select().from(users).where(eq(users.id, userId));
```

(In practice handlers call into operation functions — `createUser`, `listLoads`, etc. — which already encapsulate query composition. Reach for `eq`/`and` only when factoring a new operation.)

`link[]` does two things: it injects the resource's runtime values into `Resource.X` (e.g. `Resource.Cluster.{clusterArn,secretArn,database}` for the Aurora component, `Resource.UserPool.id`, `Resource.Files.name`) and grants the matching IAM permissions automatically. There is no longer a `dsqlConnectPolicyFor` / `cognitoUserManagementPolicyFor` / `s3ObjectWritePolicyFor` helper — those were CDK-era and are gone.

### Domains (multi-domain deploy)

Each environment serves a `primaryDomain` plus `aliases` from a single `sst.aws.Router` distribution, shared with the `sst.aws.ApiGatewayV2` via `router.routeUrl("/api/*", api.url)`. Today: dev = `dev.twy.am` + `dev.twy.be`; prod = `twy.am` + `twy.be` (+ `www.*`). All domains share the same Aurora cluster, Cognito user pool, API Gateway, and files bucket — there's exactly one backend per env. **Auth is per-origin**: Cognito tokens live in `localStorage`/cookies, so a user signed in on `twy.am` is *not* signed in on `twy.be`.

To add a new alias domain: (1) create the Route53 hosted zone in the matching AWS account; (2) point the registrar's NS records at Route53; (3) append to `aliases` in `infra/domain.ts`. SST's `dns: sst.aws.dns()` adapter handles cross-zone DNS validation and A/AAAA record creation automatically.

### Lambda runtime pattern

All Lambdas wrap their handlers with helpers from `@shared/index` (path alias inside `@twy/functions` → `packages/functions/src/shared/`):
- `middyfy` / `httpZodHandler` / `httpJwtExtractor` — composed Middy stacks for HTTP + JWT + Zod validation.
- `jsonErrorHandler` — converts `http-errors` and unknown throws into JSON.
- `toError` — narrows `unknown` from catch blocks (use this; do not type catches as `any`).

Handlers read configuration via `Resource.X` (the SST SDK), **not** `process.env.X`.

### DB / migrations

The `@twy/db` package owns the database layer: **Drizzle ORM** against an **Aurora Serverless v2 (Postgres)** cluster via the **RDS Data API** (`drizzle-orm/aws-data-api/pg`). Lambdas are *not* attached to the cluster's VPC — Drizzle talks to the cluster over HTTPS through `RDSDataClient`, which avoids cold-start tax and the NAT-Gateway cost. The cluster credentials come from `Resource.Cluster.{clusterArn,secretArn,database}` (provided by `link: [db.cluster]` in `infra/api.ts` / `infra/auth.ts`).

Schema lives under `packages/db/src/schema/`, one `pgTable` per file, using snake_case columns and camelCase TS keys (Drizzle's `casing: 'snake_case'` does the mapping). `packages/db/drizzle/` holds the generated migration SQL + `meta/` snapshots — both are checked in.

The Drizzle workflow:

```bash
# 1. Edit a schema file under packages/db/src/schema/
# 2. Diff schema → new migration SQL under packages/db/drizzle/
pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate

# 3. Apply pending migrations against the cluster bound to a stage
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
```

The runner (`packages/db/src/migration/run-migrations.ts`) is launched via `sst shell` so the same `Resource.Cluster` binding is in scope. CI invokes the same command after `sst deploy` succeeds. Migration scripts must use `process.stdout.write` for output (Biome's `noConsole` rule).

Per-stage scaling: prod stays warm at `min: 0.5 ACU`; dev (and personal stages) auto-pause at `min: 0 ACU` after ~10 min idle.

### UI

React 19 + Ant Design 6 + TanStack Query + Axios. `apps/dashboard/.env.{development,production}` are committed via a `.gitignore` exception — they hold **public, build-time** values only (mock toggle, etc.); never put secrets there. Stricter Biome rules apply here (see overrides in `biome.json`): `useExhaustiveDependencies: error`, `useHookAtTopLevel: error`, `noNonNullAssertion: error`. When wiring fetchers used inside `useEffect`, wrap them in `useCallback` to satisfy `useExhaustiveDependencies`. The Axios client uses relative `/api` — same-origin proxying through the Router means no CORS preflights.

## Tooling conventions

### TypeScript

Every package extends `tsconfig.base.json` (`target ES2024`, `module NodeNext`, `strict: true` but `strictNullChecks: false`, `isolatedModules: true`). Per-package `tsconfig.json` sets `outDir`, `rootDir`, and any `paths`.

### Biome (single tool — replaces ESLint and Prettier)

Root `biome.json` is authoritative. Format: double quotes, semicolons, trailing commas, 100-col, 2-space, LF. Notable rules and per-folder overrides:

- `noConsole` is `warn` with `["warn", "error"]` allowed. **In SST infra modules (`sst.config.ts`, `infra/**`) and migration runners, use `process.stdout.write(...)` — not `console.log`** (these paths have `noConsole: off` but the convention is to write portable code).
- `noNonNullAssertion`: `warn` globally, **`error`** in `apps/dashboard/**`, `off` in `sst.config.ts` + `infra/**` and tests.
- `noExplicitAny`: `warn`. Replace `any` with `unknown` in catches (then narrow with `toError`) and use proper Ant Design table types in components.
- `useImportType: error`. Prefer `import type { ... }` for type-only imports.
- `useExhaustiveDependencies`: `error` in `apps/dashboard/**`.
- Tests (`*.test.*`, `*.spec.*`, `__tests__/`, `__mocks__/`) get `noConsole`, `noExplicitAny`, and `noNonNullAssertion` turned off.

CI gate is `biome ci .`. Pre-commit (`.husky/pre-commit`) runs `pnpm lint-staged` → `biome check --write --no-errors-on-unmatched`.

### Commits

Conventional Commits, **scope required** (e.g. `feat(ui): add password reset flow`). Header max length **150**, parser preset `conventional-changelog-atom`. Enforced by commitlint via `commit-msg` hook. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## CI/CD

Single workflow at `.github/workflows/ci-cd.yml` on push to `master`/`main` and `workflow_dispatch`. Three jobs:

```
lint (biome ci)
  └── build (turbo run build + test)
        └── deploy (matrix: dev, prod)
              ├── sst deploy --stage <env>
              └── sst shell --stage <env> -- pnpm --filter @twy/db migrate
```

Per-environment GitHub vars (`DEV_ACCOUNT_ID`, `PROD_ACCOUNT_ID`) feed the OIDC role assumption (`arn:aws:iam::<ACCOUNT_ID>:role/github-deploy-role`). The deploy role needs Pulumi-friendly perms (S3 state bucket + DynamoDB lock table + the resource creation perms) — broader than the CDK-era CloudFormation policy.

## Pitfalls

- **`Resource.X is not defined` at TypeScript** — types are generated by SST after the first `sst dev` or `sst deploy`. They land in `sst-env.d.ts` (gitignored). Run one of those once before `tsc` will be fully happy.
- **Migrations fail with auth errors** — the deploying / shell-running IAM role is missing `rds-data:*` on the cluster (or `secretsmanager:GetSecretValue` on the cluster's managed secret). With `link[]` both should be granted automatically; check `infra/api.ts` registers `cluster` in `linkRegistry` and the relevant route's `linkKeys`. The migration runner relies on the same `link[]` because it launches under `sst shell`.
- **Stale Turbo cache** — `pnpm turbo run build --force` for one run, or `rm -rf .turbo`.
- **Husky hooks not running** — `pnpm prepare` reinstalls them; check `.husky/{pre-commit,commit-msg}` are executable.
- **Don't bypass `biome ci`** with `--no-verify` — fix the violation. The codebase has been through deliberate cleanup passes; regressions have a way of compounding.
- **Don't put secrets in `apps/dashboard/.env.*`** — those files are committed.
- **Don't rename `primaryDomain`** in `infra/domain.ts` mid-flight — SST will replace the underlying CloudFront/cert/Route53 resources rather than update them.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
