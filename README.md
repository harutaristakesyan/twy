# twy

A TypeScript monorepo for building and deploying full-stack applications on AWS. Combines a React + Ant Design frontend, business-logic Lambda services, authentication, and AWS CDK infrastructure-as-code under a single **pnpm** workspace orchestrated by **Turborepo**.

---

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Getting Started](#getting-started)
5. [Workspace Packages](#workspace-packages)
6. [Common Commands](#common-commands)
7. [Per-App Guide](#per-app-guide)
8. [Shared Packages](#shared-packages)
9. [Environments & AWS Configuration](#environments--aws-configuration)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Conventions](#conventions)
12. [Adding a New App or Package](#adding-a-new-app-or-package)
13. [Troubleshooting](#troubleshooting)

---

## Repository Layout

```
twy/
├── apps/
│   ├── front/             # @twy/front     — Vite + React 19 SPA + CDK deploy
│   ├── auth/              # @twy/auth      — Cognito + auth Lambdas (CDK)
│   ├── functions/         # @twy/functions — business Lambdas, Kysely + pg, migrations (CDK)
│   └── infra/             # @twy/infra     — shared infra: DB, Gateway, CloudFront, Domain, Auth (CDK)
├── packages/
│   └── lambda-shared/     # @twy/lambda-shared — middy wrappers, errors, common Lambda helpers
├── .github/workflows/
│   └── ci-cd.yml          # single CI/CD workflow (path-filter, build gate, infra-first deploy)
├── .husky/                # Git hooks: pre-commit (lint-staged), commit-msg (commitlint)
├── commitlint.config.mjs  # Conventional Commits enforcement
├── tsconfig.base.json     # strict TS base, extended by every package
├── turbo.json             # task pipeline (build, lint, test, synth, deploy, dev, migrate)
├── pnpm-workspace.yaml
└── package.json           # root: dev tooling, turbo, husky, prettier, commitlint, aws-cdk
```

---

## Tech Stack

| Layer            | Tools                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| Language         | TypeScript (strict) targeting `ES2022` / `NodeNext`                           |
| Package Manager  | **pnpm 10** with workspaces                                                   |
| Build Pipeline   | **Turborepo 2** (cached, parallel, dependency-aware)                          |
| Frontend         | React 19, Vite 7, Ant Design 5, TanStack Query, React Router 7, Vitest        |
| Backend          | AWS Lambda (Node 20), Middy, Zod, http-errors, Kysely, pg                     |
| Infrastructure   | AWS CDK v2, Cognito, API Gateway, CloudFront, Aurora DSQL, S3                 |
| Linting / Format | ESLint 9 (flat config), Prettier 3                                            |
| Git Workflow     | Husky 9, lint-staged 16, Commitlint (Conventional Commits, atom preset)       |
| CI/CD            | GitHub Actions with OIDC → AWS, environment-scoped secrets, dev + prod matrix |

---

## Prerequisites

| Tool       | Version    | Notes                                                    |
| ---------- | ---------- | -------------------------------------------------------- |
| Node.js    | `>=20`     | Lambdas target Node 20 runtime                           |
| pnpm       | `10.33.0+` | Pinned in root `packageManager` field                    |
| AWS CLI v2 | latest     | For local CDK deploys / debugging                        |
| Docker     | latest     | Required by CDK `NodejsFunction` for cross-arch bundling |
| Git        | `>=2.40`   | Husky hooks rely on modern git                           |

Optional but recommended:

- **AWS SSO** profile per account (`aws configure sso`) for local `cdk deploy`.
- **VS Code** with the ESLint and Prettier extensions.

---

## Getting Started

```bash
# 1. Install dependencies (single hoisted lockfile at repo root)
pnpm install

# 2. Build everything once so packages have their dist/ output
pnpm build

# 3. Run the frontend in dev mode
pnpm --filter @twy/front dev
```

That's it for local development. CDK deploys require AWS credentials — see [Environments & AWS Configuration](#environments--aws-configuration).

---

## Workspace Packages

| Path                     | Name                 | Type    | Purpose                                                              |
| ------------------------ | -------------------- | ------- | -------------------------------------------------------------------- |
| `apps/front`             | `@twy/front`         | App     | Vite + React 19 SPA with CDK deploy stack                            |
| `apps/auth`              | `@twy/auth`          | App     | Cognito user pool + auth Lambdas, deployed via CDK                   |
| `apps/functions`         | `@twy/functions`     | App     | Domain Lambdas, DB migrations (Kysely + pg), deployed via CDK        |
| `apps/infra`             | `@twy/infra`         | App     | Shared infrastructure stacks (DB, Gateway, CloudFront, Domain, etc.) |
| `packages/lambda-shared` | `@twy/lambda-shared` | Library | Reusable middy wrappers, error classes, Lambda helpers               |

All packages are `private: true`. Cross-package consumption uses pnpm's `workspace:*` protocol (see `apps/auth` and `apps/functions` depending on `@twy/lambda-shared`).

---

## Common Commands

Root-level commands run through Turborepo and are filtered automatically by the affected dependency graph.

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `pnpm install`     | Install all deps (single root lockfile)               |
| `pnpm build`       | `turbo run build` across all packages (respects deps) |
| `pnpm lint`        | `turbo run lint`                                      |
| `pnpm test`        | `turbo run test`                                      |
| `pnpm synth`       | `turbo run synth` — CDK synth for every CDK app       |
| `pnpm dev`         | `turbo run dev` (persistent; starts dev servers)      |
| `pnpm format`      | Prettier-format every supported file                  |
| `pnpm lint:commit` | Run commitlint against the in-progress commit message |

### Scoping with `--filter`

Turbo and pnpm both accept `--filter <package>` to scope work:

```bash
# Only build the front-end and its dependencies
pnpm turbo run build --filter @twy/front...

# Only run the auth synth
pnpm --filter @twy/auth synth

# Run dev for the front-end only
pnpm --filter @twy/front dev
```

The `...` suffix on a filter means "this package and everything it depends on". Useful for CI deploys to rebuild only the affected slice.

---

## Per-App Guide

### `@twy/front` — Web SPA

- **Stack:** Vite 7, React 19, Ant Design 5, TanStack Query, React Router, dayjs, Amplitude analytics, JWT-decode, Axios.
- **CDK deploy:** `bin/deploy.ts` + `bin/stack.ts` provision a CloudFront-fronted S3 hosting stack; `bin/environments.ts` holds env-specific config.
- **Vite envs:** `apps/front/.env.development` and `apps/front/.env.production` are committed (allowed via `.gitignore` exception) — they contain public build-time values, never secrets.

```bash
pnpm --filter @twy/front dev        # Vite dev server with HMR
pnpm --filter @twy/front build      # Vite production build → dist/
pnpm --filter @twy/front preview    # Serve the built bundle locally
pnpm --filter @twy/front test       # Vitest
pnpm --filter @twy/front synth      # cdk synth (deploy stack)
pnpm --filter @twy/front deploy     # cdk deploy
```

### `@twy/auth` — Cognito + Auth Lambdas

- **Stack:** AWS SDK Cognito client, Middy, Zod, `@twy/lambda-shared`.
- **CDK entry:** `bin/cdk.ts` (root app), `bin/deploy.ts` (per-env deploy driver), `bin/functionStack.ts` (Lambda + Cognito stack).

```bash
pnpm --filter @twy/auth build       # tsc → dist/
pnpm --filter @twy/auth synth
pnpm --filter @twy/auth diff
pnpm --filter @twy/auth deploy
```

### `@twy/functions` — Business Lambdas + Migrations

- **Source layout:** `src/contracts` (zod schemas), `src/functions` (handlers), `src/libs` (helpers), `src/migration` (Kysely migrations + runner), `src/utils`.
- **DB:** Kysely + `pg`, with AWS `dsql-signer` for IAM auth. Aurora DSQL is provisioned by `@twy/infra`.
- **Migrations:** `pnpm --filter @twy/functions migrate` runs `src/migration/run-migrations.ts` against the env pointed at by `ENV` / `ACCOUNT_ID` / `AWS_REGION`. CI runs migrations before deploy on this app.

```bash
pnpm --filter @twy/functions build
pnpm --filter @twy/functions migrate    # apply pending migrations against $ENV
pnpm --filter @twy/functions synth
pnpm --filter @twy/functions deploy
```

### `@twy/infra` — Shared Infrastructure

- **Stacks (`bin/stacks/`):** `auth-stack`, `db-stack`, `domain-stack`, `gateway-stack`, `cloud-front-stack`, plus a CloudFront URL-rewrite function and an `auth-template/` directory.
- **Bootstrap:** `bin/bootstrap.ts` is a one-time CDK bootstrap helper for new accounts.
- **Env-driven:** `synth`/`diff`/`deploy` accept `--context env=$ENV`.

```bash
ENV=dev pnpm --filter @twy/infra synth
ENV=dev pnpm --filter @twy/infra diff
ENV=dev pnpm --filter @twy/infra deploy
ENV=dev pnpm --filter @twy/infra bootstrap   # one-time per account
```

---

## Shared Packages

### `@twy/lambda-shared`

Reusable Lambda primitives consumed by `@twy/auth` and `@twy/functions` via `workspace:*`.

```
packages/lambda-shared/src/
├── errors.ts     # error classes
├── lambda.ts     # handler typing/wrapping helpers
├── middy/        # middy middleware wrappers
└── index.ts      # public surface
```

Build: `pnpm --filter @twy/lambda-shared build` (compiles to `dist/`). The package's `exports` field points at `./dist/index.js` — apps that consume it must run their own build after the shared lib is built (Turbo's `dependsOn: ["^build"]` handles this in CI and locally).

---

## Environments & AWS Configuration

CDK apps read three environment variables at deploy time:

| Variable     | Purpose                                     |
| ------------ | ------------------------------------------- |
| `ENV`        | Logical environment name (`dev`, `prod`)    |
| `ACCOUNT_ID` | AWS account ID where the stacks should live |
| `AWS_REGION` | Target region (default `us-east-1`)         |

In CI, these are wired from per-environment GitHub variables:

- `vars.DEV_ACCOUNT_ID` → `dev` matrix entry
- `vars.PROD_ACCOUNT_ID` → `prod` matrix entry

Authentication uses **GitHub OIDC**: each environment must have an IAM role at `arn:aws:iam::<ACCOUNT_ID>:role/github-deploy-role` whose trust policy allows the `twy` repo's workflow runs.

For local deploys, log in with `aws sso login --profile <profile>`, export the profile, and run the per-app `deploy` script.

---

## CI/CD Pipeline

Single workflow: `.github/workflows/ci-cd.yml`. Triggers on `push` to `master`/`main` and `workflow_dispatch`.

### Job graph

```
changes
  └── build (full pnpm install + turbo run build)
        └── deploy-infra        (matrix: dev, prod)
              ├── deploy-auth      (matrix: dev, prod)
              ├── deploy-front     (matrix: dev, prod)
              └── deploy-functions (matrix: dev, prod; runs migrate before deploy)
```

### Behavior

- **Path filtering** — `dorny/paths-filter@v3` decides which apps changed by inspecting modified paths (`apps/<app>/**`, `packages/lambda-shared/**` for Lambda apps, `pnpm-lock.yaml`, the workflow file). Unchanged apps skip their deploy job.
- **Build gate** — the `build` job runs `pnpm install --frozen-lockfile` + `pnpm turbo run build` for the whole workspace. If it fails, no deploy proceeds.
- **Infra-first** — every app deploy declares `needs: [changes, build, deploy-infra]` and only runs once infra is `success` or `skipped` (no infra changes). If infra fails, app deploys are blocked.
- **Per-environment matrix** — each deploy job fans out to `dev` and `prod`, attaching the matching GitHub Environment for protection rules / required reviewers.
- **Concurrency** — `deploy-<app>-<env>-<ref>` groups prevent overlapping runs against the same target.
- **OIDC** — `permissions: id-token: write` lets `aws-actions/configure-aws-credentials@v4` exchange the GitHub token for short-lived AWS credentials.
- **Migrations** — `deploy-functions` runs `pnpm run migrate` against the env's DB before `cdk deploy`.

Manual run via `workflow_dispatch` deploys _every_ app to both environments (path filter is bypassed). Use it for re-deploys or first-time provisioning.

---

## Conventions

### Commits — Conventional Commits

Enforced by `commitlint.config.mjs` via the `commit-msg` Husky hook. The accepted types are:

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Rules:

- `scope` is **required** (e.g. `feat(front): ...`, `fix(functions): ...`).
- Subject must be non-empty.
- Header max length: 150.
- Parser preset: `conventional-changelog-atom`.

Bad: `update something`
Good: `feat(auth): add password reset flow`

### Pre-commit

`.husky/pre-commit` runs `pnpm lint-staged`. Each app declares its own `lint-staged` glob/command map in its `package.json`. Typical action: ESLint `--fix` then Prettier `--write` on staged files.

### TypeScript

All packages extend `tsconfig.base.json`:

- `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`
- `strict: true` (with `strictNullChecks: false` — be explicit about null in your own code)
- `declaration` + `declarationMap` + `sourceMap` enabled
- `isolatedModules: true` (single-file transpilation safe)

Per-package `tsconfig.json` should set `compilerOptions.outDir` and any package-local `paths`.

### Formatting

Prettier 3 with default config. Run repo-wide via `pnpm format`. Editors should pick up the workspace settings automatically.

---

## Adding a New App or Package

1. Create the directory under `apps/<name>` or `packages/<name>`.
2. `package.json`:
   - `name: "@twy/<name>"`, `private: true`, `version: "0.0.1"`.
   - `scripts.build` — usually `tsc` (libs) or framework-specific (`vite build`, etc.).
   - `engines.node: ">=20"`.
3. `tsconfig.json` extending `../../tsconfig.base.json`.
4. Add the workspace dependency: `"@twy/<existing>": "workspace:*"` in `dependencies` if you need a sibling package.
5. Run `pnpm install` from the repo root to wire the symlinks.
6. If the new app is a deploy target, add a job to `.github/workflows/ci-cd.yml` mirroring the pattern of `deploy-front` / `deploy-functions`.
7. If adding a deploy target requires shared infrastructure, update `@twy/infra` first and let it land before the app.

---

## Troubleshooting

**`pnpm install` complains about peer/workspace mismatches**
Delete `node_modules` everywhere and reinstall: `find . -name node_modules -type d -prune -exec rm -rf {} + && pnpm install`.

**Turbo cache feels stale**
`pnpm turbo run build --force` bypasses the cache for one run. To clear it entirely: `rm -rf .turbo` (per-package and root).

**`cdk deploy` fails with "credentials not configured"**
Either export AWS credentials (`aws configure sso` + `export AWS_PROFILE=...`) or set `ACCOUNT_ID`, `AWS_REGION`, and ensure your shell can assume the deploy role.

**`NodejsFunction` bundling fails finding `@twy/lambda-shared`**
Make sure the shared package is built (`pnpm --filter @twy/lambda-shared build`). Turbo's `dependsOn: ["^build"]` handles this when running `pnpm build` from the root, but a bare `cdk deploy` doesn't trigger upstream builds.

**Husky hook didn't run after install**
`pnpm prepare` re-installs the hooks. Confirm `.husky/pre-commit` and `.husky/commit-msg` exist and are executable.

**Migrations fail with auth/role errors**
`@twy/functions` uses Aurora DSQL with IAM auth via `@aws-sdk/dsql-signer`. Confirm the deploying role has `dsql:DbConnectAdmin` (or equivalent) on the cluster.

**A push didn't trigger a deploy I expected**
Check the path-filter rules in `.github/workflows/ci-cd.yml` — only changes under `apps/<app>/**`, `packages/lambda-shared/**` (for Lambda apps), `pnpm-lock.yaml`, or the workflow itself trigger a deploy. Use `workflow_dispatch` to force one.

---

## License

MIT (per-package `license` field). Internal use only — every package is `private: true`.
