# twy

A TypeScript monorepo for full-stack apps on AWS — React + Ant Design SPA, Lambda services, Cognito auth, Aurora Serverless v2 + Drizzle, all under a single **pnpm** workspace, orchestrated by **Turborepo**, deployed by **SST v4 (Ion)**.

## Layout

```
twy/
├── sst.config.ts                                # SST entrypoint (single app, two stages)
├── infra/                                       # SST components, one per concern
│   ├── domain.ts, database.ts, storage.ts,
│   ├── email.ts, auth.ts, api.ts, web.ts, routes.ts
├── apps/
│   ├── ui/                @twy/ui              Vite + React 19 SPA (deployed by infra/web.ts)
│   ├── auth/              @twy/auth            Cognito flow Lambdas
│   └── functions/         @twy/functions       Domain Lambdas + Drizzle migrations
├── packages/
│   └── lambda-shared/     @twy/lambda-shared   Middy wrappers, error utils, env helpers
├── .github/workflows/ci-cd.yml
├── biome.json             unified linter + formatter (Biome 2)
├── tsconfig.base.json     strict TS base, extended by every package
├── turbo.json             task pipeline
└── pnpm-workspace.yaml
```

## Tech Stack

| Layer        | Tools                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Language     | TypeScript 6 (strict), `ES2024` / `NodeNext`                                        |
| Pkg manager  | pnpm 10 + workspaces                                                                |
| Build        | Turborepo 2 (cached, parallel, dep-aware)                                           |
| Frontend     | React 19, Vite 8 (Rolldown), Ant Design 6, TanStack Query, Vitest                   |
| Backend      | AWS Lambda Node 24, Middy 7, Zod 4, Drizzle ORM (`aws-data-api/pg`)                 |
| Infra        | SST v4 (Ion / Pulumi), Cognito, API Gateway v2, CloudFront Router, Aurora Serverless v2, S3 |
| Lint/Format  | **Biome 2** (single tool, replaces ESLint + Prettier)                               |
| Git workflow | Husky 9, lint-staged 16, Commitlint (Conventional Commits)                          |
| CI/CD        | GitHub Actions, OIDC → AWS, dev + prod matrix                                       |

## Prerequisites

| Tool       | Version    |
| ---------- | ---------- |
| Node.js    | `>=24`     |
| pnpm       | `10.33.0+` (pinned in root `packageManager`) |
| AWS CLI v2 | latest (for `sst dev`/`sst deploy`)          |

## Quick Start

```bash
pnpm install                              # single hoisted lockfile at repo root
pnpm build                                # build everything once so packages have dist/
pnpm run:ui                               # alias for: pnpm --filter @twy/ui dev

# Personal live-Lambda dev loop (your own stage, ephemeral resources):
pnpm sst dev --stage <username>
```

SST deploys need AWS credentials — see [Environments](#environments).

## Workspace Packages

| Path                     | Name                 | Purpose                                                                |
| ------------------------ | -------------------- | ---------------------------------------------------------------------- |
| `apps/ui`                | `@twy/ui`            | Vite + React 19 SPA (deployed via `sst.aws.StaticSite` + Router)       |
| `apps/auth`              | `@twy/auth`          | Cognito flow Lambdas (signup/login/verify/forgot-password)             |
| `apps/functions`         | `@twy/functions`     | Domain Lambdas + Drizzle migrations against Aurora Serverless v2       |
| `packages/lambda-shared` | `@twy/lambda-shared` | Middy wrappers (`middyfy`, `httpZodHandler`, `jsonErrorHandler`), `toError` |

All packages are `private: true`. Cross-package deps use `workspace:*`.

## Commands

Root-level scripts route through Turborepo and SST.

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `pnpm build`         | `turbo run build`                                     |
| `pnpm lint`          | `biome lint .`                                        |
| `pnpm format`        | `biome format --write .`                              |
| `pnpm check`         | `biome check --write .` (lint + format + organize)    |
| `pnpm check:ci`      | `biome ci .` (zero-exit gate, used in CI)             |
| `pnpm test`          | `turbo run test`                                      |
| `pnpm dev`           | `turbo run dev` (persistent dev servers)              |
| `pnpm run:ui`        | `pnpm --filter @twy/ui dev`                           |
| `pnpm sst dev`       | SST live-Lambda dev loop (`--stage <username>`)       |
| `pnpm sst deploy`    | Deploy all infra + apps to a stage (`--stage dev`/`prod`) |
| `pnpm sst remove`    | Tear down a stage                                     |
| `pnpm sst shell`     | Open a shell with `Resource.*` env vars from a stage  |

Scope to one package with `--filter`:

```bash
pnpm turbo run build --filter @twy/ui...   # `...` = package + its deps
pnpm --filter @twy/db migrate
```

## Per-App

### `@twy/ui` — Web SPA

Vite 8 (Rolldown), React 19, Ant Design 6, TanStack Query, Axios. Deployed by `infra/web.ts` via `sst.aws.StaticSite` behind a multi-domain `sst.aws.Router` (which also routes `/api/*` to API Gateway). Public Vite envs live at `apps/ui/.env.{development,production}` (committed via `.gitignore` exception — public build-time values only, never secrets).

```bash
pnpm --filter @twy/ui dev | build | preview | test
```

### `@twy/auth` — Cognito + Auth Lambdas

AWS SDK Cognito client + Middy + Zod, sharing helpers with `@twy/lambda-shared`. Routes (signup/login/verify/refresh/forgot-password/create-password) are declared in `infra/routes.ts` `authRoutes` and provisioned by `infra/api.ts`. The Cognito user pool, app client, and post-confirmation trigger live in `infra/auth.ts`.

### `@twy/functions` — Business Lambdas + Migrations

Layout: `src/{contracts,functions,libs,migration,utils}` + `drizzle/` (committed migration SQL + meta snapshots). DB is **Drizzle ORM** against **Aurora Serverless v2 (Postgres)** via the **RDS Data API** (`drizzle-orm/aws-data-api/pg`) — no VPC, no NAT, no static credentials. CI runs migrations after `sst deploy`.

```bash
pnpm --filter @twy/functions build
pnpm --filter @twy/db db:generate                 # diff schema → new drizzle/<n>_*.sql
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
pnpm --filter @twy/db db:studio                   # Drizzle Studio against the dev cluster
```

### `infra/` — SST infrastructure

Per-component factories called from `sst.config.ts → run()`. See `infra/CLAUDE.md` for the conventions.

| File           | Owns                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `domain.ts`    | Per-stage primary domain + aliases                                         |
| `database.ts`  | `sst.aws.Aurora` (Postgres, dataApi: true) + a small `sst.aws.Vpc`          |
| `storage.ts`   | Files S3 bucket with multi-origin CORS                                     |
| `email.ts`     | SES per apex domain (DKIM via SST DNS adapter) + SPF/DMARC TXT             |
| `auth.ts`      | Cognito user pool + app client + post-confirmation Lambda trigger          |
| `api.ts`       | ApiGatewayV2 + JWT Cognito authorizer + per-route Lambda functions         |
| `web.ts`       | `sst.aws.Router` (multi-domain CDN) + `sst.aws.StaticSite` for the UI      |
| `routes.ts`    | Single typed route table (`authRoutes` + `appRoutes` + `linkKeys` per route) |

## Shared Packages

`@twy/lambda-shared` exposes Middy wrappers (`middyfy`, `httpJwtExtractor`, `httpZodHandler`, `jsonErrorHandler`) and `toError`. Built to `dist/` via `tsc`; consumers see the typed `dist/index.js` via the `exports` field. Turbo's `dependsOn: ["^build"]` ensures it builds first.

## Environments

Two stages are configured: **dev** (`DEV_ACCOUNT_ID`, `dev.twy.am` + `dev.twy.be`) and **prod** (`PROD_ACCOUNT_ID`, `twy.am` + `twy.be` + `www.*`). Both pinned to `us-east-1` (CloudFront cert requirement). Personal stages (e.g. `--stage <username>`) are allowed for `sst dev`; they don't get a custom domain.

In CI, the AWS account ID per environment comes from per-environment GitHub vars (`vars.DEV_ACCOUNT_ID`, `vars.PROD_ACCOUNT_ID`). Auth uses **GitHub OIDC** — each account needs an IAM role at `arn:aws:iam::<ACCOUNT_ID>:role/github-deploy-role` trusting the `twy` repo's workflow runs. The role needs Pulumi-friendly perms: S3 state bucket + DynamoDB lock table + the resource-creation perms for everything in `infra/`.

For local deploys: `aws sso login --profile <profile>`, export it, and run `pnpm sst deploy --stage dev|prod`.

### Domains

Each environment serves a `primaryDomain` plus `aliases` from a single `sst.aws.Router` distribution. The Router shares the cert with `sst.aws.ApiGatewayV2` via `router.routeUrl("/api/*", api.url)`, so the SPA's relative `/api` calls are same-origin (no CORS preflight).

| Env  | `primaryDomain` | `aliases`                                       |
| ---- | --------------- | ----------------------------------------------- |
| dev  | `dev.twy.am`    | `dev.twy.be`                                    |
| prod | `twy.am`        | `twy.be`, `www.twy.am`, `www.twy.be`            |

All aliases hit the **same** backend (Aurora cluster, Cognito pool, API Gateway, files bucket). **Auth is per-origin** — Cognito tokens live in cookies/`localStorage`, which is origin-scoped. A user signed in on `twy.am` is *not* signed in on `twy.be`.

To add a new alias domain: (1) create the Route53 hosted zone in the matching AWS account; (2) point the registrar's NS records at Route53; (3) append to `aliases` in `infra/domain.ts`. SST's `dns: sst.aws.dns()` adapter handles cross-zone DNS validation and A/AAAA records automatically.

## CI/CD

Single workflow: `.github/workflows/ci-cd.yml`. Triggers on push to `master`/`main` and `workflow_dispatch`.

```
lint (biome ci)
  └── build (turbo run build + test)
        └── deploy (matrix: dev, prod)
              ├── sst deploy --stage <env>
              └── sst shell --stage <env> -- pnpm --filter @twy/db migrate
```

- **Lint gate** — `biome ci` runs before build; failures block deploy.
- **Per-env matrix** — every deploy fans out to `dev` + `prod` with environment protection rules.
- **Concurrency** — `deploy-<env>-<ref>` prevents overlapping runs.
- **OIDC** — `permissions: id-token: write` exchanges the GitHub token for short-lived AWS credentials.

`workflow_dispatch` redeploys everything to both envs — use for re-deploys or first-time provisioning.

## Conventions

**Commits — Conventional Commits** (enforced by commitlint via `commit-msg` hook). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. **Scope is required**, e.g. `feat(ui): add password reset flow`. Header max length: 150. Parser preset: `conventional-changelog-atom`.

**Pre-commit** — `.husky/pre-commit` runs `pnpm lint-staged`, which invokes `biome check --write --no-errors-on-unmatched` on staged files.

**TypeScript** — every package extends `tsconfig.base.json`: `target ES2024`, `module NodeNext`, `strict: true` (with `strictNullChecks: false`), `isolatedModules: true`. Set per-package `outDir` and any local `paths`.

**Linting & formatting** — Biome 2 only. The root `biome.json` defines rules + formatter (double quotes, semicolons, trailing commas, 100-char width, 2-space indent). Per-area overrides exist for `apps/ui` (stricter React rules) and `infra/` + tests (`noConsole` and `noNonNullAssertion` relaxed). For CLI scripts and the migration runner, use `process.stdout.write` instead of `console.log` to satisfy `noConsole`.

## Adding a New App or Package

1. Create `apps/<name>/` or `packages/<name>/`.
2. `package.json` — `name: "@twy/<name>"`, `private: true`, a `build` script, `engines.node: ">=24"`.
3. `tsconfig.json` extending `../../tsconfig.base.json`.
4. Add sibling deps as `"@twy/<sibling>": "workspace:*"`.
5. `pnpm install` from the root to wire symlinks.
6. If it adds new infra, create a factory under `infra/<thing>.ts` and call it from `sst.config.ts → run()`.

## Troubleshooting

**Peer/workspace mismatches on install** — nuke and reinstall: `find . -name node_modules -type d -prune -exec rm -rf {} + && pnpm install`.

**Stale Turbo cache** — `pnpm turbo run build --force` for one run, or `rm -rf .turbo` to wipe.

**`Resource.X is not defined` in TypeScript** — `sst-env.d.ts` is generated by SST after the first `sst dev` / `sst deploy` against the stage. Run one of those once, or rely on the manual stub in `types/sst-resources.d.ts` for editor IntelliSense.

**`sst deploy` says "credentials not configured"** — `aws sso login` + `export AWS_PROFILE=...` and re-run, or set the matching profile name in `sst.config.ts → app().providers.aws.profile`.

**Husky hooks didn't run after install** — `pnpm prepare` re-installs them; verify `.husky/{pre-commit,commit-msg}` exist and are executable.

**Migrations fail with auth errors** — `@twy/functions` uses Aurora Serverless v2 over the RDS Data API. The deploying / shell-running role needs `rds-data:*` and `secretsmanager:GetSecretValue` on the cluster. With SST `link[]` both are auto-granted; if missing, check that `infra/api.ts` registers `cluster` in `linkRegistry` and the migration runner is launched via `sst shell`.

## License

MIT, per-package. Internal use only — every package is `private: true`.
