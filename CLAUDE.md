# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`README.md` is the canonical reference for layout, scripts, and CI/CD. This file captures the constraints and conventions that aren't obvious from a single-file read.

## Where to look first

| Need | File |
|---|---|
| Per-package conventions (UI, auth, functions, infra, lambda-shared) | `apps/<name>/CLAUDE.md`, `packages/<name>/CLAUDE.md` |
| Slash commands (`/ship`, `/verify`, `/new-handler`, `/new-migration`, `/debug-test`, `/review-pr`, `/sync-docs`) | `.claude/commands/` |
| Specialized subagents (code-reviewer, debugger, security-auditor, migration-writer, lambda-handler-author, cdk-stack-reviewer, refactoring-specialist, test-writer, docs-writer) | `.claude/agents/` |
| Authoring procedures (Lambda handler, Kysely migration, UI page, CDK stack) | `.claude/skills/` |
| Permissions, hooks, model selection | `.claude/settings.json` |
| Onboarding for the agent infra itself | `.claude/README.md` |
| Project-scoped MCP servers (filesystem, git, github, postgres-dev) | `.mcp.json` |

## Verification loop

Always end a working session by running, in order:
1. `/verify` — runs `biome ci`, `turbo build`, `turbo test`, `turbo check` (matches CI exactly).
2. `code-reviewer` subagent on the diff. Address blockers/majors.
3. `/ship` — guided commit + push (Conventional Commits with required scope, header ≤150).

Never bypass the gate with `--no-verify`. Never `git push --force*` (the deny list catches it).

## Common commands

```bash
pnpm install                         # one hoisted lockfile at the root
pnpm build                           # turbo run build (respects ^build)
pnpm check                           # biome check --write . (lint + format + import sort)
pnpm check:ci                        # biome ci .  (zero-exit gate; matches CI)
pnpm test                            # turbo run test
pnpm run:ui                          # alias for pnpm --filter @twy/ui dev

# Scope to one package
pnpm --filter @twy/<name> <script>
pnpm turbo run build --filter @twy/ui...    # `...` includes deps

# Apply pending DB migrations against $ENV (Aurora DSQL via IAM)
pnpm --filter @twy/functions migrate

# CDK
ENV=dev pnpm --filter @twy/infra synth | diff | deploy | bootstrap
pnpm --filter @twy/auth      synth | diff | deploy
pnpm --filter @twy/functions synth | diff | deploy
pnpm --filter @twy/ui        synth | diff | deploy
```

Run a single Vitest file: `pnpm --filter @twy/ui exec vitest run path/to/file.test.ts`.

## Architecture

A pnpm + Turborepo workspace with four deployable apps and one shared library:

```
apps/ui          @twy/ui            React 19 + Vite SPA, deployed via CDK to S3 + CloudFront
apps/auth        @twy/auth          Cognito user pool + auth Lambdas (Middy + Zod)
apps/functions   @twy/functions     Domain Lambdas + Kysely migrations against Aurora DSQL
apps/infra       @twy/infra         Shared infra stacks: db, gateway, cloudfront, domain, auth-template
packages/lambda-shared @twy/lambda-shared   middy wrappers, error utils, requireEnv helper
```

Deploy graph (enforced by both Turbo and CI): `lambda-shared → infra → {auth, ui, functions}`. `@twy/functions` additionally runs migrations before `cdk deploy`. Cross-package deps are `workspace:*`.

Each CDK app keeps stack code under `bin/` and runtime code under `src/`. `apps/infra/bin/stacks/` holds the shared stacks; the others define one stack file plus a `cdk.ts` entrypoint and a `deploy.ts` helper.

DomainStack hands the ACM cert ARN to CloudFrontStack via an SSM parameter (`/${idPrefix}/cert/arn`), not a CFN cross-stack export. CFN exports get pinned to importing stacks — replacing the cert (e.g. when SANs change) fails with "cannot update export in use" until the importer is redeployed first. SSM resolves at deploy time, so the cert can be replaced freely. CloudFrontStack has an explicit `addDependency(domainStack)` to guarantee deploy order.

### Domains (multi-domain deploy)

Each environment serves a `primaryDomain` plus optional `additionalDomains` from a single per-env CloudFront distribution and ACM cert (`apps/infra/bin/environments.ts`). Today: dev = `dev.twy.am` + `dev.twy.be` (apex only); prod = `twy.am` + `twy.be` (each with `www`). All domains share the same DSQL cluster, Cognito user pool, API Gateway, and files bucket — there's exactly one backend per env. **Auth is per-origin**: Cognito tokens live in `localStorage`, so a user signed in on `twy.am` is *not* signed in on `twy.be` (same DB, same Cognito account — just no cross-origin token sync). The `primaryDomain` drives `idPrefix`-derived physical names (S3 buckets, SSM paths like `/twy-am/site/bucketName`); changing it would force-replace those resources, so always extend via `additionalDomains` instead.

To add a new alias domain: (1) create the Route53 hosted zone in the matching AWS account (dev zone in `DEV_ACCOUNT_ID`, prod zone in `PROD_ACCOUNT_ID`); (2) point the registrar's NS records at Route53; (3) append to `additionalDomains` in `environments.ts`. The cert uses `acm.CertificateValidation.fromDnsMultiZone` so cross-zone DNS validation is automatic.

### Lambda runtime pattern

All Lambdas wrap their handlers with helpers from `@twy/lambda-shared`:
- `middyfy` / `httpZodHandler` / `httpJwtExtractor` — composed Middy stacks for HTTP + JWT + Zod validation.
- `jsonErrorHandler` — converts `http-errors` and unknown throws into JSON.
- `toError` — narrows `unknown` from catch blocks (use this; do not type catches as `any`).
- `requireEnv("VAR")` — read env vars; throws on missing. **Use this instead of `process.env.VAR!`** — non-null assertions on env vars are how `noNonNullAssertion` violations were getting reintroduced.

`@twy/lambda-shared` is a real published-style package (`type: module`, `exports` map → `dist/index.js`). It must be built before any consumer can be bundled. Turbo's `dependsOn: ["^build"]` handles this from the root; a bare `cdk deploy` inside a Lambda app will not.

### DB / migrations

`@twy/functions` uses Kysely + `pg`. Auth is **Aurora DSQL with IAM** via `@aws-sdk/dsql-signer` — no static passwords. The deploying role needs `dsql:DbConnectAdmin` on the cluster. The migration runner is `apps/functions/src/migration/run-migrations.ts` (run via `pnpm --filter @twy/functions migrate`); CI runs it before `deploy-functions`. Migration scripts must use `process.stdout.write` for output (see linting note below).

### UI

React 19 + Ant Design 6 + TanStack Query + Axios. `apps/ui/.env.{development,production}` are committed via a `.gitignore` exception — they hold **public, build-time** values only (API base URLs, etc.); never put secrets there. Stricter Biome rules apply here (see overrides in `biome.json`): `useExhaustiveDependencies: error`, `useHookAtTopLevel: error`, `noNonNullAssertion: error`. When wiring fetchers used inside `useEffect`, wrap them in `useCallback` to satisfy `useExhaustiveDependencies`.

## Tooling conventions

### TypeScript

Every package extends `tsconfig.base.json` (`target ES2024`, `module NodeNext`, `strict: true` but `strictNullChecks: false`, `isolatedModules: true`). Per-package `tsconfig.json` sets `outDir`, `rootDir`, and any `paths`. `tsconfig.scripts.json` (functions) loosens the rules so `ts-node` can run migration scripts. `bin/tsconfig.json` for CDK entrypoints needs `"types": ["node"]` — without it, `process` is undefined.

### Biome (single tool — replaces ESLint and Prettier)

Root `biome.json` is authoritative. Format: double quotes, semicolons, trailing commas, 100-col, 2-space, LF. Notable rules and per-folder overrides:

- `noConsole` is `warn` with `["warn", "error"]` allowed. **In CDK CLI scripts (`apps/*/bin/**`) and migration runners, use `process.stdout.write(...)` — not `console.log` — to stay under the rule** (these paths have `noConsole: off` but the convention is to write portable code).
- `noNonNullAssertion`: `warn` globally, **`error`** in `apps/ui/**`, `off` in `apps/*/bin/**` and tests.
- `noExplicitAny`: `warn`. Replace `any` with `unknown` in catches (then narrow with `toError`) and use proper Ant Design table types in components.
- `useImportType: error`. Prefer `import type { ... }` for type-only imports.
- `useExhaustiveDependencies`: `error` in `apps/ui/**`. Memoize fetchers with `useCallback` before passing them to `useEffect`.
- Biome **does not have a `noVar` rule** — don't reach for it. (The override at `apps/infra/bin/stacks/cloudfront-rewrite-function.js` references `noVar: off`; that's harmless but the rule isn't real.)
- Tests (`*.test.*`, `*.spec.*`, `__tests__/`, `__mocks__/`) get `noConsole`, `noExplicitAny`, and `noNonNullAssertion` turned off.

CI gate is `biome ci .`. Pre-commit (`.husky/pre-commit`) runs `pnpm lint-staged` → `biome check --write --no-errors-on-unmatched`.

### Commits

Conventional Commits, **scope required** (e.g. `feat(ui): add password reset flow`). Header max length **150**, parser preset `conventional-changelog-atom`. Enforced by commitlint via `commit-msg` hook. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## CI/CD

Single workflow at `.github/workflows/ci-cd.yml` on push to `master`/`main` and `workflow_dispatch`. The shape:

```
changes (path filter, dorny/paths-filter)
  └── lint (biome ci) — blocks everything
        └── build (turbo run build, all packages)
              └── deploy-infra            (matrix: dev, prod)
                    ├── deploy-auth       (matrix: dev, prod)
                    ├── deploy-ui         (matrix: dev, prod)
                    └── deploy-functions  (matrix: dev, prod; migrate → deploy)
```

Per-environment GitHub vars (`DEV_ACCOUNT_ID`, `PROD_ACCOUNT_ID`) feed `ACCOUNT_ID`; auth is **GitHub OIDC** assuming `arn:aws:iam::<ACCOUNT_ID>:role/github-deploy-role`. `workflow_dispatch` skips path filtering and deploys everything to both envs.

When adding a new deployable app, mirror the `deploy-<name>` job and add the path filter — otherwise it never runs. See README's "Adding a New App or Package" recipe.

## Pitfalls

- **`cdk deploy` from a Lambda app says it can't resolve `@twy/lambda-shared`** — build the shared package first (`pnpm --filter @twy/lambda-shared build`) or run via Turbo, which handles the order.
- **Migrations fail with auth/role errors** — the deploying IAM role is missing `dsql:DbConnectAdmin` on the cluster.
- **Stale Turbo cache** — `pnpm turbo run build --force` for one run, or `rm -rf .turbo`.
- **Husky hooks not running** — `pnpm prepare` reinstalls them; check `.husky/{pre-commit,commit-msg}` are executable.
- **Don't bypass `biome ci`** with `--no-verify` — fix the violation. The codebase has been through deliberate cleanup passes (catch typing, `useCallback` wrapping, `requireEnv` migration); regressions have a way of compounding.
