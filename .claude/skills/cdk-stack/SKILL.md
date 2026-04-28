---
name: cdk-stack
description: Use when authoring or modifying a CDK stack under apps/*/bin/stacks/. Covers the SSM-instead-of-CFN-export pattern, the multi-domain idPrefix derivation, NodejsFunction bundling for ESM lambda-shared, and the deploy ordering that the pnpm/turbo graph enforces.
---

# CDK stack authoring

## When this skill applies

- Adding a new construct or stack under `apps/infra/bin/stacks/`, `apps/auth/bin/`, `apps/ui/bin/`, or `apps/functions/bin/`.
- Modifying cross-stack data flow (cert ARN, HTTP API ID, DSQL cluster ID, S3 bucket name).
- Adding a new Lambda or new route via `HttpLambdaRouter`.
- Adding a new domain or alias.

## Architecture invariants (DO NOT VIOLATE)

1. **Single CloudFront + single API Gateway per env**, serving `primaryDomain` + `additionalDomains[]`. To add a domain: extend `additionalDomains` in `apps/infra/bin/environments.ts`, never change `primaryDomain` (it derives `idPrefix` which derives S3 bucket names — replacing them loses content).
2. **Cross-stack data goes via SSM**, not CFN exports. The cert ARN, HTTP API ID, DB cluster ID all use `ssm.StringParameter.valueForStringParameter(...)`. Add `addDependency()` from consumer to producer for ordering.
3. **Deploy graph**: `lambda-shared → infra → {auth, ui, functions}`. Within `infra`: `domain → cloudfront`, `db → gateway`, etc. Turbo handles package-level order; CDK explicit `addDependency()` handles stack-level.
4. **Lambda runtime**: Node 24, ARM64, `bundling.format: "esm"` because `@twy/lambda-shared` is ESM-only.
5. **CloudFront Function** (`cloudfront-rewrite-function.js`) is **not** Lambda@Edge. Runtime: `cloudfront-js-2.0`. Entrypoint exported function name: `handler`. Don't change either.

## SSM cross-stack pattern (template)

```typescript
// Producer stack
import * as ssm from "aws-cdk-lib/aws-ssm";

const certArnParam = new ssm.StringParameter(this, "CertArnParam", {
  parameterName: `/${idPrefix}/cert/arn`,
  stringValue: cert.certificateArn,
});

// Consumer stack
const certArn = ssm.StringParameter.valueForStringParameter(
  this,
  `/${idPrefix}/cert/arn`,
);
// Then: this.addDependency(producerStack);
```

Why not CFN exports? Replacing the cert (e.g. when SANs change) fails with "cannot update export in use" until the importer is redeployed first. SSM resolves at deploy time, not synth time, so the cert can be replaced without coordinating a redeploy of every consumer.

## NodejsFunction template

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

new NodejsFunction(this, "MyFunction", {
  entry: path.join(__dirname, "..", "src", "functions", "myFunc.ts"),
  handler: "handler",
  runtime: lambda.Runtime.NODEJS_24_X,
  architecture: lambda.Architecture.ARM_64,
  memorySize: 256,
  timeout: cdk.Duration.seconds(15),
  bundling: {
    target: "node24",
    format: lambda.OutputFormat.ESM,
    externalModules: ["@aws-sdk/*"],   // runtime provides v3 SDK
    // workspace: include lambda-shared in the bundle
    nodeModules: [],
  },
  environment: { ENV: env.name },
});
```

## Aurora DSQL access for Lambda

```typescript
fn.addToRolePolicy(new iam.PolicyStatement({
  actions: ["dsql:DbConnect"],            // or DbConnectAdmin for write
  resources: [`arn:aws:dsql:${region}:${account}:cluster/${clusterId}`],
}));
```

## Deploy command reference

```
ENV=dev pnpm --filter @twy/<pkg> synth     # generate cdk.out
ENV=dev pnpm --filter @twy/<pkg> diff      # see what would change
ENV=dev pnpm --filter @twy/<pkg> deploy    # apply
```

For `@twy/functions`, migrations run BEFORE `cdk deploy` in CI:
```
ENV=dev pnpm --filter @twy/functions migrate
ENV=dev pnpm --filter @twy/functions deploy
```

## Common mistakes

- **Adding a new `cdk.CfnOutput({ exportName: ... })`** — pins the importing stack. Use SSM.
- **Renaming `primaryDomain` instead of extending `additionalDomains`** — replaces S3 buckets, loses content.
- **Forgetting `bundling.format: "esm"`** — `@twy/lambda-shared` is ESM-only; CommonJS bundle fails at runtime.
- **Forgetting `architecture: ARM_64`** — works but you pay 20% more and ARM is the project default.
- **`RemovalPolicy.DESTROY` on the DSQL cluster** — losing the cluster loses all data; keep `RETAIN` in prod.
- **Hardcoded ACM cert in non-`us-east-1`** — CloudFront only accepts certs from us-east-1.
