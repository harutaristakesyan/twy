# apps/infra — `@twy/infra`

Shared CDK stacks (DB, Domain, CloudFront, Auth, Gateway). This package is consumed by `@twy/auth`, `@twy/ui`, and `@twy/functions` via SSM parameter cross-stack references — never via CFN exports.

> Read root `CLAUDE.md` first. The cross-stack pattern in this package is **the** load-bearing convention. Read it carefully before editing.

## Stacks

```
apps/infra/bin/stacks/
├── db-stack.ts             # Aurora DSQL cluster (CfnCluster, deletionProtection: false in dev)
├── domain-stack.ts         # Route53 hosted zones + ACM cert (multi-zone DNS validation)
├── cloud-front-stack.ts    # Single CloudFront distribution serving all domains for the env
├── cloudfront-rewrite-function.js  # CloudFront Function (cloudfront-js-2.0), entry name = "handler"
├── auth-stack.ts           # Cognito user pool
├── gateway-stack.ts        # HttpApi + JWT authorizer (Cognito)
└── auth-template/email.ts  # Cognito email templates
```

`bin/environments.ts` declares the `EnvConfig` type and the `environments` record. Edit it to add a new alias domain — never to rename the primary.

## The SSM cross-stack pattern (READ THIS)

Cross-stack data flows via SSM parameters, **not** CloudFormation exports.

Why: when a CFN export is consumed by another stack, the producer can't change the value until the consumer stops importing it. We hit this with the cert ARN — replacing the cert (e.g. when SANs change for a new alias domain) failed with "cannot update export in use" until the importer was redeployed first. The fix (commit `8e7fc75`): switch to `ssm.StringParameter`. SSM resolves at deploy time, not synth time, so the producer can change freely.

Producer:
```typescript
new ssm.StringParameter(this, "CertArnParam", {
  parameterName: `/${idPrefix}/cert/arn`,
  stringValue: cert.certificateArn,
});
```

Consumer:
```typescript
const certArn = ssm.StringParameter.valueForStringParameter(
  this,
  `/${idPrefix}/cert/arn`,
);
// then add explicit dependency for ordering
this.addDependency(domainStack);
```

If you find yourself reaching for `cdk.CfnOutput({ exportName: ... })` for cross-stack data — stop. Use SSM. The `cdk-stack-reviewer` subagent flags any new CFN export.

## idPrefix-derived physical names

```typescript
const idPrefix = env.primaryDomain.replace(/\./g, "-");  // "dev-twy-am", "twy-am"
```

This `idPrefix` is used in:
- S3 bucket names (`${idPrefix}-site`, `${idPrefix}-files`)
- SSM parameter paths (`/${idPrefix}/cert/arn`, `/${idPrefix}/site/bucketName`)
- Log group names
- CloudFront distribution comments

**NEVER change `primaryDomain`** in `environments.ts`. It would force-replace the S3 buckets (losing content) and break every consumer that reads `idPrefix`-derived SSM parameters. To add a new domain, extend `additionalDomains[]`.

## Multi-domain ACM cert

Defined in `domain-stack.ts`:

```typescript
new acm.Certificate(this, "Cert", {
  domainName: env.primaryDomain,
  subjectAlternativeNames: [
    ...env.additionalDomains,
    ...(env.includeWww ? [`www.${env.primaryDomain}`, ...env.additionalDomains.map(d => `www.${d}`)] : []),
  ],
  validation: acm.CertificateValidation.fromDnsMultiZone({
    [env.primaryDomain]: primaryZone,
    ...Object.fromEntries(env.additionalDomains.map((d, i) => [d, additionalZones[i]])),
  }),
});
```

Cert MUST be in `us-east-1` (CloudFront requirement). The stack pins this region.

To add a new domain:
1. Create the Route53 hosted zone in the matching AWS account (dev zone in `DEV_ACCOUNT_ID`, prod zone in `PROD_ACCOUNT_ID`).
2. Point the registrar's NS records at Route53.
3. Append to `additionalDomains` in `environments.ts`.
4. Deploy `apps/infra` — DNS validation handles the rest via `fromDnsMultiZone`.

## CloudFront Function

`cloudfront-rewrite-function.js` is a **CloudFront Function** (NOT Lambda@Edge). Constraints:

- Runtime: `cloudfront-js-2.0` (pinned in `cloud-front-stack.ts`).
- Exported function MUST be named `handler` (commit `894a530` restored this).
- Plain JS (`.js`), not TypeScript. The Biome override at `apps/infra/bin/stacks/cloudfront-rewrite-function.js` exempts it from TS strict rules and `noVar`.
- No imports. CloudFront Functions are constrained to a small standard library — see AWS docs.

Don't change the runtime version without reading the AWS migration guide. CF-JS 1.0 is missing ES6+ features.

## Stack ordering

Within `infra`:
1. `DbStack`
2. `DomainStack` (independent of DB)
3. `CloudFrontStack` (depends on `DomainStack` for cert ARN via SSM — explicit `addDependency`)
4. `AuthStack` (Cognito user pool)
5. `GatewayStack` (HttpApi + JWT authorizer pointing at Cognito; depends on `AuthStack`)

Cross-app:
- `lambda-shared` builds first (Turbo `^build`).
- `infra` deploys before `auth`/`ui`/`functions` (CI matrix dependency).

## Deploy

```bash
ENV=dev pnpm --filter @twy/infra synth
ENV=dev pnpm --filter @twy/infra diff
ENV=dev pnpm --filter @twy/infra deploy
ENV=dev pnpm --filter @twy/infra exec cdk bootstrap   # one-time per account/region
```

## Common pitfalls

- **Adding a CFN export** when SSM would work — flagged by `cdk-stack-reviewer`.
- **Renaming `primaryDomain`** — forces resource replacement; data loss possible.
- **Cert outside us-east-1** — CloudFront rejects.
- **`RemovalPolicy.DESTROY` on the DSQL cluster** — irrecoverable data loss.
- **Forgetting `addDependency()`** when reading SSM — synth succeeds, deploy fails.
