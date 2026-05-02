---
name: cdk-stack
description: Use when authoring or modifying an SST infrastructure module under infra/ (or sst.config.ts). Covers the link[]-instead-of-SSM pattern, multi-domain Router config, Function bundling for ESM lambda-shared, and the deploy ordering SST handles automatically.
---

# SST infrastructure module authoring

> **Note**: this skill replaces the original CDK-era guidance. The folder is still called `cdk-stack` for now; the content is SST-only.

## When this skill applies

- Adding a new component to `infra/` or `sst.config.ts`.
- Modifying cross-component data flow (cluster endpoint, Cognito IDs, S3 bucket name, etc.).
- Adding a new Lambda or new HTTP route via `routes.ts`.
- Adding a new domain or alias.

## Architecture invariants (DO NOT VIOLATE)

1. **Single Router + single ApiGatewayV2 per stage**, serving `primaryDomain` + `aliases[]`. To add a domain: extend `aliases` in `infra/domain.ts`, never change `primaryDomain` (it derives the cert SAN list, the Router origin, and the `sst.aws.dns()` Route53 lookup).
2. **Cross-component data goes via `link[]`**, never via SSM, never via env-var injection. The handler reads the value through the Resource SDK (`Resource.Cluster.host`, `Resource.UserPoolClient.id`, `Resource.Files.name`).
3. **Deploy graph is implicit** — SST's pulumi engine resolves dependencies from the order/relationships in `run()`. You do not need `addDependency()` calls.
4. **Lambda runtime**: Node 24, ARM64. SST handles esbuild bundling on `sst deploy`; you do not configure NodejsFunction/esbuild externals manually.
5. **Cert is pinned to us-east-1** via `app(input).providers.aws.region`. Don't try to deploy from another region.

## `link[]` pattern (template)

```typescript
// In infra/api.ts — producer side
api.route("GET /api/user", "apps/functions/src/functions/user/get.handler", {
  auth: { jwt: { authorizer: jwt.id } },
  transform: {
    function: {
      link: [db.cluster, auth.userPool],
    },
  },
});

// In the handler — consumer side
import { Resource } from "sst";
const hostname = Resource.Cluster.host;
const userPoolId = Resource.UserPool.id;
```

`link[]` does two things at once: it injects the resource's runtime values into the `Resource.X` SDK, and it grants the IAM permissions the resource needs (e.g. `dsql:DbConnectAdmin` on the cluster, `cognito-idp:AdminUpdateUserAttributes` on the user pool). There are no manual `iam.PolicyStatement` constructions in the new infra.

## Adding a new HTTP route (cookbook)

1. Author the handler under `apps/auth/src/functions/` (Cognito flows) or `apps/functions/src/functions/<domain>/` (JWT-protected business logic). Read configuration via `Resource.X` only.
2. Append a `RouteDef` to `infra/routes.ts`:
   ```ts
   {
     handler: "apps/functions/src/functions/<domain>/<verb>.handler",
     routeKey: "POST /api/<domain>",
     requiresAuth: true,
     linkKeys: ["cluster"],
   }
   ```
3. If you need a new resource type (not yet in `LinkKey`), add it to `infra/routes.ts` `LinkKey` union and `infra/api.ts` `linkRegistry`.
4. `pnpm sst deploy --stage dev` (locally) or push to trigger CI.

## Adding a new component

1. New file at `infra/<thing>.ts` with `/// <reference path="../.sst/platform/config.d.ts" />` first line.
2. Export a factory `export function create<Thing>(args) { ... return { thing }; }`.
3. Wire into `sst.config.ts → run()` after its dependencies.
4. If it needs to be reachable from a Lambda, add it to `linkRegistry` in `infra/api.ts`.

## Common mistakes

- **Reaching for SSM** (`Resource.X` is the answer instead).
- **Setting `process.env.X` in the Function transform** (link will inject the value automatically; only set process env for variables that are not other SST resources).
- **Manually attaching IAM policies via `transform.function.role.addToPolicy(...)`** — `link[]` already grants the right perms.
- **Renaming `primaryDomain` instead of extending `aliases`** — replaces the underlying CDN/cert.
- **Forgetting that `Resource.X` types only exist after the first `sst dev` / `sst deploy`** for that stage.
- **Adding a custom domain to ApiGatewayV2 directly** — the API is fronted by the Router via `routeUrl("/api/*", api.url)` for same-origin routing. A second domain on the API leaks the API origin.
- **Putting handler infra (function definition, route wiring) inside the handler file** — keep handlers pure; declare them once in `infra/routes.ts`.

## Deploy command reference

```
pnpm sst dev --stage <username>     # personal live-dev
pnpm sst deploy --stage dev         # full apply against dev
pnpm sst deploy --stage prod        # full apply against prod
pnpm sst remove --stage <stage>     # tear-down
pnpm sst shell --stage <stage>      # open a shell with Resource.* env vars
```

For migrations:
```
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
```
