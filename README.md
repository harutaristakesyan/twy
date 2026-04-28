# twy

A TypeScript monorepo for full-stack apps on AWS — React + Ant Design SPA, Lambda services, Cognito auth, and AWS CDK infrastructure under a single **pnpm** workspace orchestrated by **Turborepo**.

## Layout

```
twy/
├── apps/
│   ├── ui/                @twy/ui            Vite + React 19 SPA + CDK deploy
│   ├── auth/              @twy/auth          Cognito + auth Lambdas (CDK)
│   ├── functions/         @twy/functions     Domain Lambdas, Kysely migrations (CDK)
│   └── infra/             @twy/infra         Shared infra: DB, Gateway, CloudFront, Domain (CDK)
├── packages/
│   └── lambda-shared/     @twy/lambda-shared middy wrappers, error utils, env helpers
├── .github/workflows/ci-cd.yml
├── biome.json             unified linter + formatter (Biome)
├── tsconfig.base.json     strict TS base, extended by every package
├── turbo.json             task pipeline
└── pnpm-workspace.yaml
```

## Tech Stack

| Layer        | Tools                                                                |
| ------------ | -------------------------------------------------------------------- |
| Language     | TypeScript 6 (strict), `ES2022` / `NodeNext`                         |
| Pkg manager  | pnpm 10 + workspaces                                                 |
| Build        | Turborepo 2 (cached, parallel, dep-aware)                            |
| Frontend     | React 19, Vite 8 (Rolldown), Ant Design 6, TanStack Query, Vitest    |
| Backend      | AWS Lambda Node 24, Middy 7, Zod 4, Kysely + pg                      |
| Infra        | AWS CDK v2, Cognito, API Gateway, CloudFront, Aurora DSQL, S3        |
| Lint/Format  | **Biome 2** (single tool, replaces ESLint + Prettier)                |
| Git workflow | Husky 9, lint-staged 16, Commitlint (Conventional Commits)           |
| CI/CD        | GitHub Actions, OIDC → AWS, dev + prod matrix                        |

## Prerequisites

| Tool       | Version    |
| ---------- | ---------- |
| Node.js    | `>=24`     |
| pnpm       | `10.33.0+` (pinned in root `packageManager`) |
| AWS CLI v2 | latest (for local CDK) |
| Docker     | latest (CDK `NodejsFunction` cross-arch bundling) |

## Quick Start

```bash
pnpm install               # single hoisted lockfile at repo root
pnpm build                 # build everything once so packages have dist/
pnpm run:ui                # alias for: pnpm --filter @twy/ui dev
```

CDK deploys need AWS credentials — see [Environments](#environments).

## Workspace Packages

| Path                     | Name                 | Purpose                                                |
| ------------------------ | -------------------- | ------------------------------------------------------ |
| `apps/ui`                | `@twy/ui`            | Vite + React 19 SPA + CDK hosting stack                |
| `apps/auth`              | `@twy/auth`          | Cognito user pool + auth Lambdas                       |
| `apps/functions`         | `@twy/functions`     | Domain Lambdas + DB migrations (Kysely + pg)           |
| `apps/infra`             | `@twy/infra`         | Shared infra stacks (DB, Gateway, CloudFront, Domain)  |
| `packages/lambda-shared` | `@twy/lambda-shared` | middy wrappers, error utils, `requireEnv` helper       |

All packages are `private: true`. Cross-package deps use `workspace:*`.

## Commands

Root-level scripts route through Turborepo and respect the dependency graph.

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `pnpm build`       | `turbo run build`                                     |
| `pnpm lint`        | `biome lint .`                                        |
| `pnpm format`      | `biome format --write .`                              |
| `pnpm check`       | `biome check --write .` (lint + format + organize)    |
| `pnpm check:ci`    | `biome ci .` (zero-exit gate, used in CI)             |
| `pnpm test`        | `turbo run test`                                      |
| `pnpm synth`       | `turbo run synth` (CDK synth across CDK apps)         |
| `pnpm dev`         | `turbo run dev` (persistent dev servers)              |
| `pnpm run:ui`      | `pnpm --filter @twy/ui dev`                           |

Scope to one package with `--filter`:

```bash
pnpm turbo run build --filter @twy/ui...   # `...` = package + its deps
pnpm --filter @twy/auth synth
```

## Per-App

### `@twy/ui` — Web SPA

Vite 8 (Rolldown), React 19, Ant Design 6, TanStack Query, Axios. CDK stack in `bin/` provisions S3 + CloudFront. Public Vite envs live at `apps/ui/.env.{development,production}` (committed via `.gitignore` exception — public build-time values only, never secrets).

```bash
pnpm --filter @twy/ui dev | build | preview | test | synth | deploy
```

### `@twy/auth` — Cognito + Auth Lambdas

AWS SDK Cognito client + Middy + Zod, sharing helpers with `@twy/lambda-shared`. CDK in `bin/{cdk,deploy,functionStack}.ts`.

```bash
pnpm --filter @twy/auth build | synth | diff | deploy
```

### `@twy/functions` — Business Lambdas + Migrations

Layout: `src/{contracts,functions,libs,migration,utils}`. DB is Kysely + `pg` with AWS `dsql-signer` for IAM auth (Aurora DSQL is provisioned by `@twy/infra`). CI runs migrations before deploying this app.

```bash
pnpm --filter @twy/functions build
pnpm --filter @twy/functions migrate    # apply pending migrations against $ENV
pnpm --filter @twy/functions synth | deploy
```

### `@twy/infra` — Shared Infrastructure

Stacks under `bin/stacks/`: `auth-stack`, `db-stack`, `domain-stack`, `gateway-stack`, `cloud-front-stack`. `bin/bootstrap.ts` is the one-time CDK bootstrap helper.

```bash
ENV=dev pnpm --filter @twy/infra synth | diff | deploy | bootstrap
```

## Shared Packages

`@twy/lambda-shared` exposes middy wrappers (`middyfy`, `httpJwtExtractor`, `httpZodHandler`, `jsonErrorHandler`), `toError`, and `requireEnv`. Built to `dist/` via `tsc`; consumers see the typed `dist/index.js` via the `exports` field. Turbo's `dependsOn: ["^build"]` ensures it builds first.

## Environments

CDK reads three env vars at deploy time:

| Var          | Purpose                                  |
| ------------ | ---------------------------------------- |
| `ENV`        | Logical env name (`dev`, `prod`)         |
| `ACCOUNT_ID` | Target AWS account                       |
| `AWS_REGION` | Target region (default `us-east-1`)      |

In CI these come from per-environment GitHub vars (`vars.DEV_ACCOUNT_ID`, `vars.PROD_ACCOUNT_ID`). Auth uses **GitHub OIDC** — each account needs an IAM role at `arn:aws:iam::<ACCOUNT_ID>:role/github-deploy-role` trusting the `twy` repo's workflow runs.

For local deploys: `aws sso login --profile <profile>`, export it, run the per-app `deploy` script.

## CI/CD

Single workflow: `.github/workflows/ci-cd.yml`. Triggers on push to `master`/`main` and `workflow_dispatch`.

```
changes (path filter)
  └── lint (biome ci)
        └── build (pnpm install + turbo run build)
              └── deploy-infra              (matrix: dev, prod)
                    ├── deploy-auth         (matrix: dev, prod)
                    ├── deploy-ui           (matrix: dev, prod)
                    └── deploy-functions    (matrix: dev, prod; migrate → deploy)
```

- **Path filtering** (`dorny/paths-filter@v3`) — apps with no relevant changes skip their deploy job.
- **Lint gate** — `biome ci` runs before build; failures block everything.
- **Infra-first** — every app deploy waits on `deploy-infra` (success or skipped).
- **Per-env matrix** — every deploy fans out to `dev` + `prod` with environment protection rules.
- **Concurrency** — `deploy-<app>-<env>-<ref>` prevents overlapping runs.
- **OIDC** — `permissions: id-token: write` exchanges the GitHub token for short-lived AWS credentials.

`workflow_dispatch` bypasses the path filter and deploys every app to both envs — use for re-deploys or first-time provisioning.

## Conventions

**Commits — Conventional Commits** (enforced by commitlint via `commit-msg` hook). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. **Scope is required**, e.g. `feat(ui): add password reset flow`. Header max length: 150. Parser preset: `conventional-changelog-atom`.

**Pre-commit** — `.husky/pre-commit` runs `pnpm lint-staged`, which invokes `biome check --write --no-errors-on-unmatched` on staged files (single tool, fast).

**TypeScript** — every package extends `tsconfig.base.json`: `target ES2022`, `module NodeNext`, `strict: true` (with `strictNullChecks: false`), `isolatedModules: true`, declaration + sourceMaps on. Set per-package `outDir` and any local `paths`.

**Linting & formatting** — Biome 2 only. The root `biome.json` defines rules + formatter (double quotes, semicolons, trailing commas, 100-char width, 2-space indent). Per-app overrides exist for `apps/ui` (stricter React rules) and `apps/*/bin` (CDK CLI scripts). `noConsole` is on with `warn`/`error` allowed — for CLI scripts use `process.stdout.write` instead of `console.log`.

## Adding a New App or Package

1. Create `apps/<name>/` or `packages/<name>/`.
2. `package.json` — `name: "@twy/<name>"`, `private: true`, `version: "0.0.1"`, a `build` script, `engines.node: ">=24"`.
3. `tsconfig.json` extending `../../tsconfig.base.json`.
4. Add sibling deps as `"@twy/<sibling>": "workspace:*"`.
5. `pnpm install` from the root to wire symlinks.
6. If it's a deploy target, add a `deploy-<name>` job to `.github/workflows/ci-cd.yml` mirroring `deploy-ui` / `deploy-functions`, and add the path filter.
7. If it depends on new shared infra, update `@twy/infra` first and let it land.

## Troubleshooting

**Peer/workspace mismatches on install** — nuke and reinstall: `find . -name node_modules -type d -prune -exec rm -rf {} + && pnpm install`.

**Stale Turbo cache** — `pnpm turbo run build --force` for one run, or `rm -rf .turbo` to wipe.

**`cdk deploy` says "credentials not configured"** — `aws sso login` + `export AWS_PROFILE=...`, or set `ACCOUNT_ID` / `AWS_REGION` and ensure your shell can assume the deploy role.

**`NodejsFunction` bundling can't find `@twy/lambda-shared`** — build the shared package first: `pnpm --filter @twy/lambda-shared build`. Turbo handles this from the root; a bare `cdk deploy` does not.

**Husky hooks didn't run after install** — `pnpm prepare` re-installs them; verify `.husky/{pre-commit,commit-msg}` exist and are executable.

**Migrations fail with auth/role errors** — `@twy/functions` uses Aurora DSQL with IAM auth (`@aws-sdk/dsql-signer`). Confirm the deploying role has `dsql:DbConnectAdmin` on the cluster.

**A push didn't trigger an expected deploy** — the path filter only fires on changes under `apps/<app>/**`, `packages/lambda-shared/**` (for Lambda apps), `pnpm-lock.yaml`, or the workflow file. Force one with `workflow_dispatch`.

## License

MIT, per-package. Internal use only — every package is `private: true`.
